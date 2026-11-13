'use strict';
// 한 판씩 맞춘다 :  node fit.js <hard|master> <g,g,…>   →  out/<mode>-<g>.json
// 씨앗은 일부러 나눠 쓴다 : 맞춤 1000~ · 탐색 3000~ · 후보 겨루기 4000~ · 검증 5000~(다시 맞출 때마다 +100) · 곁 표 6000~ · 확인 9000~
//  → 「맞춘 씨앗으로 채점」하지 않는다
const fs = require('fs'), path = require('path');
const L = require('./lib');
const [mode, gs] = process.argv.slice(2);
const OUT = path.join(__dirname, process.env.OUT || 'out');
fs.mkdirSync(OUT, { recursive: true });
const QUICK = !!process.env.QUICK;
const N = QUICK ? { coarse: 6, pick: 6, fit: 12, search: 4, cand: 8, ver: 16, verBest: 24, conf: 0, tries: 3 }
  : { coarse: 8, pick: 12, fit: 32, search: 6, cand: 16, ver: 40, verBest: 48, conf: 24, tries: 6 };
const TARGET = { hard: 0.78, master: 0.48 };
const BAND = { hard: [0.70, 0.85], master: [0.35, 0.60] };
const LO = 1, HI = { hard: 400, master: 800 };
let sims = 0;
const ev = (st, build, cfg, seeds) => { sims += seeds.length; return L.evalCfg(st, build, cfg, seeds); };
const rate = (g, mag, build, cfg, seeds) => ev(L.variant(g, mode, mag), build, cfg, seeds);

// 위에서 아래로 훑어 「처음으로 목표를 넘는 배율」을 찾고 그 칸 안에서만 이분한다.
// 까닭 : 승률이 배율에 한 방향으로만 줄지 않는 판이 있다(5-10 금속 대왕 : 낮은 배율에서 서로 못 뚫어 시간 초과) → 그냥 이분하면 엉뚱한 낮은 자리에 멈춘다
function fitTop(g, build, cfg, target, lo, hi, step, sCoarse, sFine, iters) {
  let m = hi, top = hi;
  for (; m > lo; top = m, m /= step) if (rate(g, m, build, cfg, sCoarse).rate >= target) break;
  if (m <= lo) m = lo;
  return L.bisect(x => rate(g, x, build, cfg, sFine).rate, target, m, top, iters);
}
const baseCfg = b => ({ leader: L.ST.LEADER_AT[b.w - 1], deck: L.fitCost(b, L.defaultDeck(b)).slice(0, 10), wt: 3, bm: 3, react: 0.5 });
const clone = c => ({ ...c, deck: c.deck.slice() });

// 화로 목표 · 브레스 기준을 고른다 (기준 AI 가 그 판에서 덜 바보 같게)
function pickPol(g, mag, build, cfg, seeds, lock) {
  let best = null;
  for (const sloppy of [false, true]) for (const wt of lock ? [3] : [1, 3, 5]) for (const bm of [1, 3]) {   // 무작위 뽑기도 후보 : 금속 좀비 판처럼 「싼 것부터 차례로」가 손해인 판이 있다
    const r = rate(g, mag, build, { ...cfg, wt, bm, sloppy }, seeds);
    if (!best || r.score > best.r.score + 1e-9) best = { wt, bm, sloppy, r };
  }
  return { ...cfg, wt: best.wt, bm: best.bm, sloppy: best.sloppy };
}

// 최고 정책 찾기 : 리더 → 화로 → 덱(빼기 · 넣기 · 바꾸기) → 브레스 · 반응 → 무작위 뽑기 → 리더 · 화로 한 번 더. 한 번에 한 가지만 바꾸고 좋아지면 받아들인다
function search(g, mag, build, cfg0, seeds) {
  const b = L.stages[g - 1], st = L.variant(g, mode, mag);
  let cur = clone(cfg0), curS = ev(st, build, cur, seeds).score, tried = 1;
  const tryCfg = c => { tried++; const s = ev(st, build, c, seeds).score; if (s > curS + 1e-9) { cur = c; curS = s; return true; } return false; };
  const leaders = Object.keys(L.D.leaders), pool = L.fitCost(b, L.STORY);
  const passLeader = () => { for (const ld of leaders) if (ld !== cur.leader) tryCfg({ ...clone(cur), leader: ld }); };
  const passWt = () => { if (b.walletLock != null) return; for (let wt = 0; wt <= 7; wt++) if (wt !== cur.wt) tryCfg({ ...clone(cur), wt }); };
  const passDeck = () => {
    for (let round = 0; round < 2; round++) {
      let moved = false;
      for (let i = cur.deck.length - 1; i >= 0 && cur.deck.length > 4; i--) {
        const c = clone(cur); c.deck.splice(i, 1); if (tryCfg(c)) moved = true;
      }
      for (const id of pool) if (!cur.deck.includes(id)) {
        if (cur.deck.length < 10) { const c = clone(cur); c.deck.push(id); if (tryCfg(c)) { moved = true; continue; } }
        for (let i = 0; i < cur.deck.length; i++) { const c = clone(cur); c.deck[i] = id; if (tryCfg(c)) { moved = true; break; } }
      }
      if (!moved) break;
    }
  };
  const passHands = () => { for (const bm of [1, 2, 3, 5]) for (const react of [0.5, 0.2]) if (bm !== cur.bm || react !== cur.react) tryCfg({ ...clone(cur), bm, react }); };
  const passSloppy = () => tryCfg({ ...clone(cur), sloppy: !cur.sloppy });
  passLeader(); passWt(); passDeck(); passHands(); passSloppy(); passLeader(); passWt();
  return { cfg: cur, score: curS, tried };
}

// 검증 : 새 씨앗으로 재고, 띠를 벗어나면 벗어난 만큼만 배율을 옮겨 다시 (승률 곡선이 가팔라 큰 걸음은 넘어간다)
function settle(g, m, build, cfg, target, band) {
  let v, tries = 0, seeds;
  for (;;) {
    seeds = L.seedsOf(5000 + 100 * tries, N.verBest);
    v = rate(g, m, build, cfg, seeds);
    if ((v.rate >= band[0] && v.rate <= band[1]) || tries >= N.tries) break;
    m *= Math.exp(Math.max(-0.08, Math.min(0.08, (v.rate - target) / 3))); tries++;
  }
  return { m, v, tries, seeds };
}

const pct = r => Math.round(r.rate * 100);
function one(g) {
  const t0 = Date.now(), b = L.stages[g - 1], base = baseCfg(b), lock = b.walletLock != null, sd = 6000;
  sims = 0;
  const out = { id: b.id, g, w: b.w, s: b.s, type: b.type, gim: b.gim, mode };
  if (mode === 'hard') {
    const build = L.recOf(b.w);
    let m = fitTop(g, build, base, TARGET.hard, LO, HI.hard, 1.6, L.seedsOf(1000, N.coarse), L.seedsOf(1050, N.coarse), 3);
    const cfg = pickPol(g, m * 1.1, build, base, L.seedsOf(1100, N.pick), lock);
    m = fitTop(g, build, cfg, TARGET.hard, m / 2.5, Math.min(HI.hard, m * 2.5), 1.25, L.seedsOf(1150, N.coarse), L.seedsOf(1200, N.fit), 5);
    const S = settle(g, m, build, cfg, TARGET.hard, BAND.hard); m = S.m;
    const st = L.variant(g, mode, m);
    Object.assign(out, { mag: st.mag, atkMag: st.atkMag, baseHp: st.baseHp, limit: st.limit, cfg, tries: S.tries, rec: S.v });
    out.half = rate(g, m, L.halfOf(b.w), cfg, L.seedsOf(sd, N.ver));
    out.none = rate(g, m, L.BUILD.none, cfg, L.seedsOf(sd, N.ver));
    out.max = rate(g, m, L.BUILD.max, cfg, L.seedsOf(sd, N.ver));
    out.sloppy = rate(g, m, build, { ...cfg, sloppy: true, react: 1.2 }, L.seedsOf(sd, N.ver));
    if (N.conf) out.conf = rate(g, m, build, cfg, L.seedsOf(9000, N.conf));
    out.edge = m >= HI.hard * 0.97 || m <= LO * 1.03;
    out.pass = !out.edge && S.v.rate >= BAND.hard[0] && S.v.rate <= BAND.hard[1];
    out.par = Math.round(S.v.t);
  } else {
    const build = L.BUILD.max, norm = { ...base, wt: 3 };
    let m0 = fitTop(g, build, base, 0.5, LO, HI.master, 1.6, L.seedsOf(1000, N.coarse), L.seedsOf(1050, N.coarse), 3);
    const cfg0 = pickPol(g, m0 * 1.1, build, base, L.seedsOf(1100, N.pick), lock);
    m0 = fitTop(g, build, cfg0, 0.5, m0 / 2.5, Math.min(HI.master, m0 * 2.5), 1.25, L.seedsOf(1150, N.coarse), L.seedsOf(1200, N.fit), 4);
    const s1 = search(g, m0 * 1.3, build, cfg0, L.seedsOf(3000, N.search));
    // 후보를 새 씨앗으로 다시 겨룬다 → 탐색이 씨앗 운에 속은 것을 걸러 낸다
    const cands = [s1.cfg, { ...clone(s1.cfg), sloppy: false }, cfg0, norm, ...L.ARCH.map(a => ({ ...a, deck: L.fitCost(b, a.deck) }))];
    let best = null, bs = -1;
    for (const c of cands) { const r = rate(g, m0 * 1.3, build, c, L.seedsOf(4000, N.cand)); if (r.score > bs + 1e-9) { bs = r.score; best = c; } }
    let m, S, nv, n2, swaps = 0;
    for (;;) {
      m = fitTop(g, build, best, TARGET.master, m0 * 0.8, Math.min(HI.master, m0 * 5), 1.25, L.seedsOf(1250, N.coarse), L.seedsOf(1300, N.fit), 5);
      S = settle(g, m, build, best, TARGET.master, BAND.master); m = S.m;
      nv = rate(g, m, build, norm, S.seeds); n2 = rate(g, m, build, cfg0, S.seeds);          // 같은 씨앗으로 「보통 정책」과 견준다
      const alt = { ...clone(best), sloppy: !best.sloppy }, av = rate(g, m, build, alt, S.seeds);
      let top = n2.rate >= nv.rate ? [n2, cfg0] : [nv, norm];
      if (av.rate > top[0].rate) top = [av, alt];
      const slow = { ...clone(best), sloppy: true, react: 1.2 }, sv = rate(g, m, build, slow, S.seeds);   // 느린 손 + 섞어 뽑기가 더 나은 판도 있다(지갑이 쌓여 큰 용이 나옴)
      if (sv.rate > top[0].rate) top = [sv, slow];
      if (top[0].rate <= S.v.rate || swaps >= 2) break;
      best = top[1]; swaps++;                                                                // 보통 정책이 더 잘하면 그것이 「최고」다 → 다시 맞춘다
    }
    const st = L.variant(g, mode, m);
    Object.assign(out, { mag: st.mag, atkMag: st.atkMag, baseHp: st.baseHp, limit: st.limit, m0: Math.round(m0 * 100) / 100, tries: S.tries, swaps,
      cfg: best, cfg0, tried: s1.tried, best: S.v, norm: nv, norm2: n2 });
    out.p90 = rate(g, m, L.BUILD.p90, best, L.seedsOf(sd, N.ver));
    out.p80 = rate(g, m, L.BUILD.p80, best, L.seedsOf(sd, N.ver));
    out.none = rate(g, m, L.BUILD.none, best, L.seedsOf(sd, N.ver));
    out.sloppy = rate(g, m, build, { ...best, sloppy: true, react: 1.2 }, L.seedsOf(sd, N.ver));
    if (N.conf) out.conf = rate(g, m, build, best, L.seedsOf(9000, N.conf));
    out.edge = m >= HI.master * 0.97 || m <= LO * 1.03;
    out.pass = !out.edge && S.v.rate >= BAND.master[0] && S.v.rate <= BAND.master[1];
    out.par = Math.round(S.v.t);
  }
  out.rule = L.RULE; out.sims = sims; out.sec = Math.round((Date.now() - t0) / 100) / 10;
  fs.writeFileSync(path.join(OUT, `${mode}-${g}.json`), JSON.stringify(out));
  const R = k => (out[k] ? pct(out[k]) + '%' : '-');
  console.log(mode === 'hard'
    ? `${out.id} hard mag ${out.mag} wt${out.cfg.wt} bm${out.cfg.bm}${out.cfg.sloppy ? ' 무작위' : ''} | 권장 ${R('rec')} 절반 ${R('half')} 안키움 ${R('none')} 최대 ${R('max')} 서툰 ${R('sloppy')} 확인 ${R('conf')} | par ${out.par}s to ${out.rec.to} | ${out.pass ? 'OK' : 'FAIL'} t${out.tries} ${out.sims}판 ${out.sec}s`
    : `${out.id} master mag ${out.mag}(기본 ${out.m0}) | 최고 ${R('best')} 보통 ${R('norm')} 기준AI ${R('norm2')} 90% ${R('p90')} 80% ${R('p80')} 안키움 ${R('none')} 서툰 ${R('sloppy')} 확인 ${R('conf')} | ${out.cfg.leader} wt${out.cfg.wt} bm${out.cfg.bm} r${out.cfg.react}${out.cfg.sloppy ? ' 무작위' : ''} 덱${out.cfg.deck.length} | par ${out.par}s | ${out.pass ? 'OK' : 'FAIL'} t${out.tries} s${out.swaps} ${out.sims}판 ${out.sec}s`);
}
for (const g of gs.split(',').map(Number)) one(g);
