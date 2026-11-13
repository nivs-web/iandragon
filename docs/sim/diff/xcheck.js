'use strict';
// 교차 검사 :  node xcheck.js master <g,g,…>      (XV=1 이면 바꾸지 않고 재기만 한다)
// 탐색은 한 번에 한 가지만 바꾸는 방식이라 좋은 덱을 놓칠 수 있다 → 같은 월드 · 짝 월드의 다른 판이 찾은 「최고 구성」과 「묶어 두기」 덱 2개를 가져와 같은 씨앗으로 겨룬다.
// 가져온 구성이 8%p 넘게 더 잘하면 그것이 이 판의 최고 구성이다 → 바꿔 적고(xswap) refit.js 로 배율을 다시 맞춘다.
const fs = require('fs'), path = require('path');
const L = require('./lib');
const [mode, gs] = process.argv.slice(2), OUT = path.join(__dirname, process.env.OUT || 'out'), VERIFY = !!process.env.XV;
const rd = g => { try { return JSON.parse(fs.readFileSync(path.join(OUT, `${mode}-${g}.json`), 'utf8')); } catch (e) { return null; } };
const keyOf = c => JSON.stringify([c.leader, c.deck, c.wt, c.bm, c.react, !!c.sloppy]);
for (const g of gs.split(',').map(Number)) {
  const t0 = Date.now(), o = rd(g); if (!o) continue;
  const b = L.stages[g - 1], w = b.w, pw = w <= 5 ? w + 5 : w - 5, st = L.variant(g, mode, o.mag), build = L.BUILD.max;
  const pool = new Map(), add = (c, from) => { const cc = { leader: c.leader, deck: L.fitCost(b, c.deck), wt: b.walletLock != null ? o.cfg.wt : c.wt, bm: c.bm, react: c.react, sloppy: !!c.sloppy }; const k = keyOf(cc); if (cc.deck.length >= 4 && k !== keyOf(o.cfg) && !pool.has(k)) pool.set(k, { cfg: cc, from }); };
  L.ARCH.forEach((a, i) => add(a, '묶어 두기 ' + (i + 1)));
  for (const ww of [w, pw]) for (let s = 1; s <= 10; s++) { const gg = (ww - 1) * 10 + s; if (gg === g) continue; const x = rd(gg); if (x) { add(x.cfg, x.id); if (x.cfgPrev) add(x.cfgPrev, x.id + ' 옛'); } }
  let sims = 0; const ev = (c, seeds) => { sims += seeds.length; return L.evalCfg(st, build, c, seeds); };
  const s1 = L.seedsOf(4500 + (o.refit || 0) * 50, 8), s2 = L.seedsOf(4600 + (o.refit || 0) * 100, 48);
  const first = [...pool.values()].map(p => ({ ...p, r: ev(p.cfg, s1) })).sort((a, c) => c.r.score - a.r.score).slice(0, 3);
  const own = ev(o.cfg, s2);
  let top = null; for (const p of first) { const r = ev(p.cfg, s2); if (!top || r.rate > top.r.rate || (r.rate === top.r.rate && r.score > top.r.score)) top = { ...p, r }; }
  o.x = { pool: pool.size, own: own.rate, top: top ? top.r.rate : 0, from: top ? top.from : null, sims };
  let tag = 'ok';
  if (top && top.r.rate > own.rate + 0.08) {
    if (VERIFY) { o.x.cfg = top.cfg; tag = '더 나은 구성 있음(재기만)'; }
    else { o.cfgPrev = o.cfg; o.cfg = top.cfg; o.xswap = (o.xswap || 0) + 1; o.xfrom = top.from; tag = 'SWAP'; }
  }
  o.sims += sims; o.sec = Math.round((o.sec + (Date.now() - t0) / 1000) * 10) / 10;
  fs.writeFileSync(path.join(OUT, `${mode}-${g}.json`), JSON.stringify(o));
  console.log(`${o.id} ${mode} 교차 검사 mag ${o.mag} | 내 구성 ${Math.round(own.rate * 100)}% · 가져온 최고 ${top ? Math.round(top.r.rate * 100) + '% (' + top.from + ')' : '-'} · 후보 ${pool.size} | ${tag} ${sims}판 ${Math.round((Date.now() - t0) / 1000)}s`);
}
