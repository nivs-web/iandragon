'use strict';
// 합격선을 못 맞춘 판만 다시 맞춘다 :  node refit.js <hard|master> <g,g,…>
// 정책(덱 · 리더 · 화로)은 그대로 두고 배율만 : 새 씨앗 96개(7000~)로 곡선을 훑고 이분 → 또 다른 새 씨앗 48개(5600~)로 검증 → 곁 표 · 확인 다시
const fs = require('fs'), path = require('path');
const L = require('./lib');
const [mode, gs] = process.argv.slice(2);
const OUT = path.join(__dirname, process.env.OUT || 'out');
const TARGET = +process.env.TG || { hard: 0.78, master: 0.48 }[mode], BAND = { hard: [0.70, 0.85], master: [0.35, 0.60] }[mode], HI = { hard: 400, master: 800 }[mode];
let sims = 0;
const rate = (g, mag, build, cfg, seeds) => { sims += seeds.length; return L.evalCfg(L.variant(g, mode, mag), build, cfg, seeds); };
for (const g of gs.split(',').map(Number)) {
  const t0 = Date.now(), f = path.join(OUT, `${mode}-${g}.json`), o = JSON.parse(fs.readFileSync(f, 'utf8')), b = L.stages[g - 1];
  const build = mode === 'hard' ? L.recOf(b.w) : L.BUILD.max, cfg = o.cfg, n = (o.refit || 0);
  sims = 0;
  const S1 = L.seedsOf(7000 + 200 * n, 48), S2 = L.seedsOf(7000 + 200 * n, 96);
  // 위에서 아래로 6%씩 훑어 처음 목표를 넘는 칸을 찾는다
  let m = o.mag * 1.35, top; const curve = [];
  if (process.env.MAG) m = +process.env.MAG;   // 곡선이 절벽인 판 : 배율을 손으로 짚어 주고 검증만 한다
  else {
  while (m < HI * 1.6 && rate(g, m, build, cfg, S1).rate >= TARGET) m *= 1.35;   // 정책을 바꿔 훨씬 세졌으면 위로 먼저 찾는다
  top = m;
  for (; m > o.mag / 1.6; top = m, m /= 1.06) { const r = rate(g, m, build, cfg, S1).rate; curve.push([Math.round(m * 100) / 100, Math.round(r * 100)]); if (r >= TARGET) break; }
  m = L.bisect(x => rate(g, x, build, cfg, S2).rate, TARGET, m, top, 6);
  }
  let v, tries = 0, seeds;
  for (;;) {
    seeds = L.seedsOf(5600 + 100 * tries + 1000 * n, 48); v = rate(g, m, build, cfg, seeds);
    if ((v.rate >= BAND[0] && v.rate <= BAND[1]) || tries >= 4 || process.env.FIX) break;
    m *= Math.exp(Math.max(-0.03, Math.min(0.03, (v.rate - TARGET) / 6))); tries++;
  }
  const st = L.variant(g, mode, m), sd = L.seedsOf(6000, 40), cf = L.seedsOf(9000, 24);
  Object.assign(o, { mag: st.mag, atkMag: st.atkMag, baseHp: st.baseHp, limit: st.limit, refit: n + 1, rule: L.RULE, curve, tries: (o.tries || 0) + tries, par: Math.round(v.t) });
  if (mode === 'hard') {
    o.rec = v; o.half = rate(g, m, L.halfOf(b.w), cfg, sd); o.none = rate(g, m, L.BUILD.none, cfg, sd); o.max = rate(g, m, L.BUILD.max, cfg, sd);
    o.sloppy = rate(g, m, build, { ...cfg, sloppy: true, react: 1.2 }, sd);
  } else {
    const base = { leader: L.ST.LEADER_AT[b.w - 1], deck: L.fitCost(b, L.defaultDeck(b)).slice(0, 10), wt: 3, bm: 3, react: 0.5 };
    o.best = v; o.norm = rate(g, m, build, base, seeds); o.norm2 = rate(g, m, build, o.cfg0, seeds);
    o.p90 = rate(g, m, L.BUILD.p90, cfg, sd); o.p80 = rate(g, m, L.BUILD.p80, cfg, sd); o.none = rate(g, m, L.BUILD.none, cfg, sd);
    o.sloppy = rate(g, m, build, { ...cfg, sloppy: true, react: 1.2 }, sd);
  }
  o.conf = rate(g, m, build, cfg, cf);
  o.edge = m >= HI * 0.97 || m <= 1.03; o.pass = !o.edge && v.rate >= BAND[0] && v.rate <= BAND[1];
  o.sims += sims; o.sec = Math.round((o.sec + (Date.now() - t0) / 1000) * 10) / 10;
  fs.writeFileSync(f, JSON.stringify(o));
  console.log(`${o.id} ${mode} 다시 맞춤 mag ${o.mag} | ${mode === 'hard' ? '권장' : '최고'} ${Math.round(v.rate * 100)}% 확인 ${Math.round(o.conf.rate * 100)}% | 곡선 ${JSON.stringify(curve)} | ${o.pass ? 'OK' : 'FAIL'} ${sims}판 ${Math.round((Date.now() - t0) / 1000)}s`);
}
