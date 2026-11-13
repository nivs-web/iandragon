'use strict';
// 다시 재기만 :  node remeasure.js <hard|master> <g,g,…>      (배율 · 정책은 그대로, 지금 엔진으로 검증 값만 새로)
// 엔진이 바뀌었을 때(11/13 : 허락 전 엔진 → 배포 엔진) 맞춘 숫자가 아직 합격선 안인지 본다. report.js 가 이 값으로 판정한다.
// 씨앗은 맞춤과 같은 규칙 : 검증 5000~(48) · 곁 표 6000~(40) · 확인 9000~(24). 옛 값은 o.prev 에 남긴다.
const fs = require('fs'), path = require('path');
const L = require('./lib');
const [mode, gs] = process.argv.slice(2);
const OUT = path.join(__dirname, process.env.OUT || 'out');
let sims = 0;
const rate = (g, mag, build, cfg, seeds) => { sims += seeds.length; return L.evalCfg(L.variant(g, mode, mag), build, cfg, seeds); };
const pc = r => (r ? Math.round(r.rate * 100) + '%' : '-');
for (const g of gs.split(',').map(Number)) {
  const t0 = Date.now(), f = path.join(OUT, `${mode}-${g}.json`), o = JSON.parse(fs.readFileSync(f, 'utf8')), b = L.stages[g - 1];
  const m = o.mag, cfg = o.cfg, ver = L.seedsOf(5000, 48), sd = L.seedsOf(6000, 40), cf = L.seedsOf(9000, 24);
  sims = 0;
  if (mode === 'hard') {
    const build = L.recOf(b.w);
    o.prev = { rec: o.rec, conf: o.conf, par: o.par };
    o.rec = rate(g, m, build, cfg, ver);
    o.half = rate(g, m, L.halfOf(b.w), cfg, sd); o.none = rate(g, m, L.BUILD.none, cfg, sd); o.max = rate(g, m, L.BUILD.max, cfg, sd);
    o.sloppy = rate(g, m, build, { ...cfg, sloppy: true, react: 1.2 }, sd);
    o.conf = rate(g, m, build, cfg, cf);
    o.par = Math.round(o.rec.t);
    o.pass = !o.edge && o.rec.rate >= 0.70 && o.rec.rate <= 0.85;
  } else {
    const build = L.BUILD.max, base = { leader: L.ST.LEADER_AT[b.w - 1], deck: L.fitCost(b, L.defaultDeck(b)).slice(0, 10), wt: 3, bm: 3, react: 0.5 };
    o.prev = { best: o.best, conf: o.conf, par: o.par };
    o.best = rate(g, m, build, cfg, ver); o.norm = rate(g, m, build, base, ver); o.norm2 = rate(g, m, build, o.cfg0, ver);
    o.p90 = rate(g, m, L.BUILD.p90, cfg, sd); o.p80 = rate(g, m, L.BUILD.p80, cfg, sd); o.none = rate(g, m, L.BUILD.none, cfg, sd);
    o.sloppy = rate(g, m, build, { ...cfg, sloppy: true, react: 1.2 }, sd);
    o.conf = rate(g, m, build, cfg, cf);
    o.par = Math.round(o.best.t);
    o.pass = !o.edge && o.best.rate >= 0.35 && o.best.rate <= 0.60;
  }
  o.engine = 'clean';                                   // 배포 엔진(브레스 뜸 없음 · 얼음 4초)으로 잰 값
  o.sims += sims; o.sec = Math.round((o.sec + (Date.now() - t0) / 1000) * 10) / 10;
  fs.writeFileSync(f, JSON.stringify(o));
  const k = mode === 'hard' ? 'rec' : 'best';
  console.log(`${o.id} ${mode} 다시 잼 mag ${o.mag} | ${mode === 'hard' ? '권장' : '최고'} ${pc(o.prev[k])} → ${pc(o[k])} · 확인 ${pc(o.prev.conf)} → ${pc(o.conf)} | ${o.pass ? 'OK' : 'FAIL'} ${sims}판 ${Math.round((Date.now() - t0) / 1000)}s`);
}
