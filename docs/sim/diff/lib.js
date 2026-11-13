'use strict';
// 좀비와 드래곤 — 어려움 · 초고수 맞춤 도구 (2026-11-13 · 난이도 기획)
// docs/sim 의 계산기(../engine.js · ../data.js · ../stages.js · ../stages.generated.json)를 그대로 불러 쓴다 — 배포된 게임과 같은 엔진(브레스 뜸 없음 · 얼음 4초).
// 게임과 같게 하려고 「초강력 브레스」(fs-idg render/breathInfo.js SUPER — 게임 battle.js 가 코어에 넘기는 리더 숫자)만 덧씌운다.
const E = require('../engine'), D0 = require('../data'), ST = require('../stages'), stages = require('../stages.generated.json');

/* ── 게임과 같게 : 초강력 브레스 (fs-idg render/breathInfo.js 와 같은 식) */
const SUPER = { dmg: 2.5, range: 1.25, kb: 2, charge: 1.4 };
const superLeader = L => ({ ...L, dmg: L.dmg * SUPER.dmg, range: Math.round(L.range * SUPER.range), kb: L.freeze ? L.kb : Math.max(SUPER.kb, (L.kb || 0) * 2), charge: Math.round(L.charge * SUPER.charge) });
const D = { ...D0, enemies: { ...D0.enemies }, leaders: Object.fromEntries(Object.entries(D0.leaders).map(([k, L]) => [k, superLeader(L)])) };

/* ── 키우기 : 지금 게임에 있는 것만 (드래곤 레벨 · 연구소 7종 · 보물 10종). 부화 「+」와 편의품은 넣지 않는다(운 · 소모품) */
const FLOOR = 21;                                   // 어려움 · 초고수 출전 레벨 바닥 (드래곤캐슬 기획 11.4)
// lab = 연구소 레벨(0~9, 7종 모두 같다고 봄) · T = 보물 단계(0~3, 10종 평균)
function bonusOf(lab, T) {
  return {
    income: (1 + 0.02 * lab) * (1 + 0.04 * T), walletMax: (1 + 0.05 * lab) * (1 + 0.10 * T), startMoney: 20 * lab + 25 * T,
    baseHp: (1 + 0.05 * lab) * (1 + 0.10 * T), breathDmg: (1 + 0.05 * lab) * (1 + 0.10 * T), breathCharge: (1 + 0.02 * lab) * (1 + 0.05 * T),
    cooldown: 1 + 0.03 * T, bounty: (1 + 0.03 * lab) * (1 + 0.05 * T), atk: 1 + 0.03 * T, hp: 1 + 0.03 * T,
  };
}
const BUILD = {
  max: { lv: 30, lab: 9, T: 3 },                    // 지금 가능한 최대 (확정 키우기)
  p90: { lv: 27, lab: 8, T: 2.7 },                  // 모든 숫자가 최대의 90% (레벨 27 · 연구소 8 · 보물 7종 3단계+3종 2단계)
  p80: { lv: 24, lab: 7, T: 2.4 },
  none: { lv: 21, lab: 0, T: 0 },                   // 안 키움 (레벨은 바닥 21)
};
// 어려움 권장 키우기 (월드마다)
const REC = [null, [21, 5, 2], [22, 6, 2], [23, 7, 2], [24, 8, 2], [25, 9, 2], [26, 9, 2.5], [27, 9, 2.5], [28, 9, 3], [29, 9, 3], [30, 9, 3]];
const recOf = w => ({ lv: REC[w][0], lab: REC[w][1], T: REC[w][2] });
const halfOf = w => ({ lv: FLOOR + Math.floor((REC[w][0] - FLOOR) / 2), lab: REC[w][1] / 2, T: REC[w][2] / 2 });

const STORY = ST.UNLOCK.map(u => u[0]);
function defaultDeck(st) {                          // 게임의 기준 덱 (stages.js refLoad 와 같은 순서)
  const W = ST.WORLDS[st.w - 1];
  return ['kkomul', 'doldeung', ...W.must, ...ST.PRIORITY].filter((id, i, a) => a.indexOf(id) === i);
}
const fitCost = (st, ids) => (st.costMax ? ids.filter(id => D.units[id].cost <= st.costMax) : ids);
function mkLoad(st, build, cfg) {
  cfg = cfg || {};
  const ids = fitCost(st, cfg.deck || defaultDeck(st)).slice(0, cfg.deck ? 99 : 10);
  return { side: 0, deck: ids.map(id => ({ id, lv: Math.max(FLOOR, build.lv) })), leader: cfg.leader || ST.LEADER_AT[st.w - 1], leaderLv: FLOOR,
    bonus: bonusOf(build.lab, build.T), skills: ['gust', 'frost'] };
}
const polOf = cfg => ({ walletTarget: cfg.wt == null ? 3 : cfg.wt, react: cfg.react || 0.5, breathMin: cfg.bm || 3, useSkills: true, useRage: true, sloppy: !!cfg.sloppy });

/* ── 어려움 · 초고수 스테이지 만들기
   보통 스테이지를 늘리는 것이 아니라 stages.js 의 설계도(buildStage)를 그대로 따라 「다시 짓는다」 :
   ① 그 월드 좀비 6종이 1판부터 전부 나온다  ② 물결이 더 크다(dens)  ③ 짝 월드(1~5 ↔ 6~10) 좀비가 끼어든다(mix)
   ④ 기믹(황금 · 달리기 · 화로 고정 …)과 보스는 보통과 같다  ⑤ 제한 시간  ⑥ 마지막으로 배율 mag 하나만 계산기로 맞춘다(공격 = mag × AR) */
const WAVE = { period: 20, first: 5, grow: 0.2 }, TRICKLE = [5, 7];
const ROLE = { T: { n: 1, at: 0, gap: 1.2 }, H: { n: 0.34, at: 0, gap: 2 }, F: { n: 3, at: 0.5, gap: 0.6 }, R: { n: 0.8, at: 1.5, gap: 1.0 }, Q: { n: 2, at: 2.5, gap: 0.5 }, X: { n: 0.5, at: 3, gap: 1.0 } };
const DENS = [0, 0.75, 0.85, 0.95, 0.90, 0.85, 1.05, 1.00, 1.30, 1.05, 0.70];
const env = (k, d) => +(process.env[k] || d);
const MODE = {
  hard: { dens: env('HD', 1.5), limit: env('HL', 420), baseK: env('HB', 1.5), mix: { T: env('HMT', 0.5), R: env('HMR', 0.4) }, mid2: 0, one: env('HO', 1) },
  master: { dens: env('MD', 2), limit: env('ML', 360), baseK: env('MB', 2), mix: { T: env('MMT', 0.7), R: env('MMR', 0.6), H: 0.2, X: 0.4 }, mid2: 2, one: env('MO', 0), firm: env('MF', 10) }   // one 0 = 뚜껑 없음 : 초고수에 뚜껑을 걸면 월드 1 · 2 가 체력 스펀지가 된다(1-1 체력 배율 551 · 2-1 은 800 에도 못 맞춤),
};
// 규칙 2 (11/13) : 초고수 월드 1 · 2 는 방패 역할(H) 좀비가 「굳센」(밀치기에 안 밀림) 것으로 나온다.
// 까닭 : 월드 1 · 2 좀비는 밀치기 · 감속을 막는 능력이 하나도 없어서, 레벨 30 퉤퉤(밀치기) + 얼음땡(감속) + 꼬물이로 영영 묶어 둘 수 있다 → 배율을 5만 배로 올려도 100% 이긴다(1-5 · 2-1 에서 확인)
// 규칙 3 (11/13 03:40) : 월드 1 · 2 만이 아니라 **모든 월드**에서. 규칙 2 로 100판을 맞추고 교차 검사를 해 보니 월드 3 · 5 · 6 · 8 도 같은 「묶어 두기」 덱이 이겨서
// 배율이 어려움의 5 ~ 8배(6-9 는 401 · 8-1 은 248 · 5-4 는 233)까지 올라갔다 = 체력 스펀지. 방패 역할(H) 좀비를 굳세게 하면 그 덱은 0% 가 된다(probe19.js).
// 월드 1 · 2 는 규칙 2 와 규칙 3 이 똑같다(자기 H · 짝 월드 H 가 이미 굳세거나 골렘).
const RULE = 3;
// 굳센 좀비 4종(shieldFirm · lavaFirm · gearFirm · shroomFirm)은 ../data.js 에 있다(원본 + kbImmune · 게임 data/enemies.js 로 그대로 옮겨진다). 엔진은 kbImmune(골렘 · 보스가 쓰는 규칙)을 이미 안다.
for (const id of ['shield', 'lava', 'gear', 'shroom']) if (!D.enemies[id + 'Firm'] || !D.enemies[id + 'Firm'].kbImmune) throw new Error('data.js 에 ' + id + 'Firm 이 없다');
// 「묶어 두기」 덱 두 가지 : 탐색이 놓쳐도 후보 겨루기에 늘 넣는다
const ARCH = [
  { leader: 'solaris', deck: ['kkomul', 'doldeung', 'kungkwang', 'giljjuk', 'dungsil', 'twetwe', 'banjjak', 'eoreum'], wt: 5, bm: 1, react: 0.5, sloppy: true },
  { leader: 'sandscale', deck: ['kkomul', 'bangul', 'kungkwang', 'giljjuk', 'dungsil', 'twetwe', 'eoreum', 'banjjak'], wt: 5, bm: 1, react: 0.5, sloppy: false },
];
const TANK_HP = Math.round(D0.units.doldeung.hp * E.powerMul(FLOOR));   // 2599
const P21 = E.powerMul(FLOOR), r2 = v => Math.round(v * 100) / 100, r1 = v => Math.round(v * 10) / 10;
function variant(g, mode, mag) {
  const b = stages[g - 1], w = b.w, s = b.s, W = ST.WORLDS[w - 1], P = MODE[mode], gim = b.gim, type = b.type;
  const PW = ST.WORLDS[(w <= 5 ? w + 5 : w - 5) - 1];
  let dens = DENS[s];
  if (gim === 'gold') dens = 0.8;
  if (gim === 'money') dens = 1.5;
  if (type === 'rush') dens = 0.6;
  dens *= P.dens;
  const limit = Math.round((b.limit || 300) * P.limit / 300 / 5) * 5;
  const st = { id: b.id, g, w, s, name: b.name, type, gim, diff: mode, length: b.length, fever: b.fever, limit, expLevel: FLOOR,
    mag: r2(mag), atkMag: r2(mag * ST.AR), baseHp: Math.round(b.baseHp * P21 / E.powerMul(b.expLevel) * P.baseK / 10) * 10, lines: [] };
  for (const k of ['enemySpeed', 'capAlly', 'walletLock', 'allySpeed', 'fog', 'costMax', 'startMoney']) if (b[k] != null) st[k] = b[k];
  const firm = id => (P.firm && w <= P.firm && D.enemies[id + 'Firm'] ? id + 'Firm' : id);
  const R = { ...W.roles, H: firm(W.roles.H) }, R2 = { ...PW.roles, H: firm(PW.roles.H) };
  if (R.H !== W.roles.H) st.firm = true;
  st.lines.push({ id: R.F, count: 999, start: 2, every: [r1(TRICKLE[0] / dens), r1(TRICKLE[1] / dens)] });
  const acc = {}, acc2 = {};
  for (const r in ROLE) { acc[r] = 0.5; acc2[r] = 0.25; }
  const waves = Math.ceil((limit - WAVE.first) / WAVE.period);
  for (let k = 0; k < waves; k++) {
    const t0 = WAVE.first + WAVE.period * k, m = dens * (1 + WAVE.grow * k);
    for (const r of ['T', 'H', 'F', 'R', 'Q', 'X']) {
      acc[r] += ROLE[r].n * m;
      const n = Math.floor(acc[r]); acc[r] -= n;
      if (n > 0) st.lines.push({ id: R[r], count: n, start: r1(t0 + ROLE[r].at), every: ROLE[r].gap });
    }
    if (k >= 1) for (const r in P.mix) {                 // 짝 월드 좀비 : 둘째 물결부터, 물결 한가운데(+10초)에 끼어든다
      acc2[r] += ROLE[r].n * m * P.mix[r];
      const n = Math.floor(acc2[r]); acc2[r] -= n;
      if (n > 0) st.lines.push({ id: R2[r], count: n, start: r1(t0 + 10 + ROLE[r].at), every: ROLE[r].gap });
    }
  }
  const q = R.Q, t = R.T;
  st.lines.push({ id: q, count: s >= 6 ? 4 : 3, baseHpBelow: 0.99, every: 0.7 });
  st.lines.push({ id: t, count: s >= 6 ? 2 : 1, baseHpBelow: 0.5, every: 1.5 });
  st.lines.push({ id: q, count: 3, baseHpBelow: 0.5, delay: 1, every: 0.7 });
  if (type === 'swarm') st.lines.push({ id: R.F, count: 8, baseHpBelow: 0.75, every: 0.5 });
  if (type === 'mid') {
    st.lines.push({ id: W.mid, count: 1, baseHpBelow: 0.75, orAfter: 45, mag: 3, boss: true, every: 999 });
    st.lines.push({ id: q, count: 4, baseHpBelow: 0.75, orAfter: 45, delay: 1, every: 0.9 });
  }
  if (type === 'boss') {
    st.lines.push({ id: W.boss, count: 1, baseHpBelow: 0.99, orAfter: 22, boss: true, every: 999 });
    st.lines.push({ id: q, count: 5, bossHpBelow: 0.5, every: 0.7 });
    st.lines.push({ id: t, count: 2, bossHpBelow: 0.5, delay: 1, every: 2 });
    if (g === 100) {
      st.lines.push({ id: 'knight', count: 2, bossHpBelow: 0.66, every: 2 });
      st.lines.push({ id: 'dragonling', count: 3, bossHpBelow: 0.33, every: 1.2 });
      st.lines.push({ id: 'golem', count: 1, bossHpBelow: 0.33, delay: 2, every: 999 });
    }
  }
  if (type === 'rush') {
    const th = [[0.92, 15], [0.62, 55], [0.32, 95]];
    W.rush.forEach((x, i) => st.lines.push({ id: x[0], count: 1, baseHpBelow: th[i][0], orAfter: th[i][1], mag: x[1], boss: true, every: 999 }));
  }
  // 초고수만 : 짝 월드의 「대왕」이 한 번 더 온다 (보스 표시 없음 → 원래 보스를 덮어쓰지 않는다)
  if (P.mid2 && type !== 'rush') st.lines.push({ id: PW.mid, count: 1, baseHpBelow: 0.45, orAfter: 110, mag: P.mid2, every: 999 });
  if (gim === 'gold') st.lines.push({ id: 'gold', count: 8, start: 10, every: [6, 9] });
  if (gim === 'eve') for (const id of ['chili', 'snowball', 'can', 'ghost', 'mummy', 'crystal']) st.lines.push({ id, count: 999, start: 20, every: [r1(30 / P.dens), r1(44 / P.dens)] });
  if (w === 10 && s === 8) st.lines.push({ id: 'crystal', count: 999, start: 24, every: [r1(20 / P.dens), r1(28 / P.dens)] });
  // 한 방 금지(느슨하게) : 늘 걸어오는 잡졸(역할 F)의 한 대가 「돌등이 Lv21 체력」× ONE 을 넘지 않게 공격 배율에 뚜껑.
  // 자폭 · 대장 · 강타형은 뺀다 — 보통 10-10 에서도 기사 한 대가 돌등이 체력의 82% 라, 그보다 엄한 뚜껑은 체력 스펀지만 만든다
  if (P.one) { st.atkCap = r2(TANK_HP * P.one / D.enemies[R.F].atk); st.atkMag = r2(Math.min(mag * ST.AR, st.atkCap)); }
  return st;
}

/* ── 돌리기 */
function run(st, build, cfg, seed) { return E.simulate(st, mkLoad(st, build, cfg), D, polOf(cfg), seed); }
// 한 판 점수 : 이기면 1 + 남은 캐슬 · 지면 좀비 성을 깎은 만큼(0~0.5) — 탐색이 「조금 더 나은 수」를 알아보게
const scoreOf = r => (r.win ? 1 + 0.3 * r.baseLeft : 0.5 * (1 - r.enemyBaseLeft));
function evalCfg(st, build, cfg, seeds) {
  let wins = 0, sc = 0, t = 0, to = 0;
  for (const sd of seeds) { const r = run(st, build, cfg, sd); if (r.win) { wins++; t += r.time; } if (r.timeout) to++; sc += scoreOf(r); }
  return { wins, n: seeds.length, rate: wins / seeds.length, score: sc / seeds.length, t: wins ? t / wins : 0, to };
}
const seedsOf = (base, n) => Array.from({ length: n }, (_, i) => base + i);
// 이길 확률이 target 이상인 가장 큰 k (k 가 커질수록 어려워진다고 보고 기하 이분)
function bisect(f, target, lo, hi, iters) {
  for (let i = 0; i < iters; i++) { const m = Math.sqrt(lo * hi); if (f(m) >= target) lo = m; else hi = m; }
  return lo;
}

module.exports = { RULE, ARCH, E, D, ST, stages, BUILD, REC, recOf, halfOf, STORY, defaultDeck, fitCost, mkLoad, polOf, MODE, variant, run, evalCfg, scoreOf, seedsOf, bisect, bonusOf, FLOOR };
