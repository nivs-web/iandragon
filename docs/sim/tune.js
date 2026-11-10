// 이안 드래곤 — 스테이지 자동 조율기
//   node tune.js <월드번호> [라운드=3]      → tuned-w<월드>.json
// 스테이지마다 두 숫자를 정한다.
//   mag    (적 배율)      = "기준 빌드 + 기준 AI 가 겨우 이기는 배율(magMax)" × 여유 계수 f
//   baseHp (적 기지 체력) = 기준 AI 의 클리어 시간이 목표 시간에 오도록
// 기준 빌드 = 그 스테이지까지 받은 스토리 드래곤만, 기대 레벨, 스킬 없음 (stages.js 의 refLoad)
'use strict';
const fs = require('fs');
const { simulate, powerMul } = require('./engine');
const D = require('./data');
const { buildStage, refLoad, expLevel, AR } = require('./stages');
const setMag = (st, m) => { st.mag = m; st.atkMag = Math.round(m * AR * 100) / 100; };

const W = +process.argv[2] || 1, ROUNDS = +process.argv[3] || 3;
const SEEDS = [1, 2, 3, 4, 5, 6], REPORT_SEEDS = [101, 102, 103, 104, 105, 106, 107, 108, 109, 110];
const pols = g => (g === 1 ? [0] : [1, 3, 5]).map(walletTarget => ({ walletTarget }));
const avg = a => a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0;

// 정책 여러 개 중 제일 잘하는 것으로 평가. need = 통과에 필요한 승수(모자라면 일찍 그만둔다)
function evalBest(st, load, seeds, policies, need) {
  let best = null;
  for (const pol of policies) {
    const rs = []; let lost = 0;
    for (const seed of seeds) {
      const r = simulate(st, load, D, pol, seed); rs.push(r);
      if (!r.win) { lost++; if (need != null && lost > seeds.length - need) break; }
    }
    const wins = rs.filter(r => r.win);
    const res = { pol, wins: wins.length, n: seeds.length, time: avg(wins.map(r => r.time)), rs };
    if (!best || res.wins > best.wins || (res.wins === best.wins && res.time < best.time)) best = res;
    if (need != null && best.wins >= need && policies.length > 1 && best.wins === seeds.length) break;
  }
  return best;
}

function tuneStage(w, s) {
  const st = buildStage(w, s), load = refLoad(st), P = pols(st.g);
  const realLimit = st.limit || 300;
  const evalLimit = Math.min(realLimit, Math.max(150, Math.round(st.target * 2.5)));
  st.baseHp = Math.round(500 * powerMul(expLevel(st.g)) * st.target / 60 / 10) * 10;
  const flags = [];
  let magMax = 1;
  for (let round = 0; round < ROUNDS; round++) {
    // 1) 겨우 이기는 배율 찾기(기하 이분법)
    st.limit = evalLimit;
    let lo = 0.3, hi = 30;
    const ok = m => { setMag(st, m); return evalBest(st, load, SEEDS, P, 5).wins >= 5; };
    if (!ok(lo)) { flags.push('못 이김@0.3'); magMax = lo; }
    else {
      for (let i = 0; i < 7; i++) { const mid = Math.sqrt(lo * hi); if (ok(mid)) lo = mid; else hi = mid; }
      magMax = lo;
    }
    setMag(st, Math.round(magMax * st.f * 100) / 100);
    st.limit = realLimit === 300 ? undefined : realLimit;
    // 2) 목표 시간에 맞게 적 기지 체력 조절
    const floorHp = Math.round(150 * powerMul(expLevel(st.g)) / 10) * 10;
    for (let i = 0; i < 6; i++) {
      const b = evalBest(st, load, SEEDS, P);
      if (!b.wins) { st.baseHp = Math.max(floorHp, Math.round(st.baseHp * 0.6 / 10) * 10); continue; }
      const ratio = st.target / b.time;
      // 기지 두들기는 시간(공성)이 전체의 30% 를 넘으면 지루하다 → 기지 체력은 거기까지만. 목표보다 빨리 끝나는 것은 괜찮다
      const siege = avg(b.rs.filter(r => r.win).map(r => (r.time - (r.firstHit || r.time)) / r.time));
      if (siege > 0.34) { const nx = Math.max(floorHp, Math.round(st.baseHp * 0.3 / siege / 10) * 10); if (nx === st.baseHp) break; st.baseHp = nx; continue; }
      if (ratio > 0.94 && ratio < 1.06) break;
      if (ratio > 1 && siege > 0.27) break;
      const k = Math.max(0.4, Math.min(siege > 0.2 ? 1.25 : 2.5, Math.sqrt(ratio) * ratio));     // ratio^1.5
      const next = Math.max(floorHp, Math.round(st.baseHp * k / 10) * 10);
      if (next === st.baseHp) break;
      st.baseHp = next;
    }
  }
  // 3) 확정값으로 성적표(조율에 쓰지 않은 시드 10개)
  // 기준 승률이 0.9 에 못 미치면 배율을 7% 씩(최대 3번) 내린다 — 마지막 벽이 운에 좌우되지 않게
  let ref, eased = 0;
  for (;;) { ref = evalBest(st, load, REPORT_SEEDS, P); if (ref.wins / ref.n >= 0.9 || eased >= 3) break; eased++; setMag(st, Math.round(st.mag * 0.93 * 100) / 100); }
  if (eased) flags.push('배율 완화 ' + eased + '단계');
  const sloppy = evalBest(st, load, REPORT_SEEDS, [{ walletTarget: 2, sloppy: true }]);
  const under = evalBest(st, refLoad(st, { dLv: -2 }), REPORT_SEEDS, P);
  const over = evalBest(st, refLoad(st, { dLv: 2 }), REPORT_SEEDS, P);
  const skl = evalBest(st, refLoad(st, { skills: true }), REPORT_SEEDS, P.map(p => ({ ...p, useSkills: true })));
  const noW = st.g === 1 || st.walletLock != null ? null : evalBest(st, load, REPORT_SEEDS, [{ walletTarget: 0 }]);
  const wr = ref.rs.filter(r => r.win);
  const out = {
    id: st.id, g: st.g, name: st.name, type: st.type, gim: st.gim, length: st.length, target: st.target, limit: st.limit || 300,
    mag: st.mag, atkMag: st.atkMag, magMax: Math.round(magMax * 100) / 100, baseHp: st.baseHp, lv: expLevel(st.g), deck: load.deck.map(d => d.id), leader: load.leader,
    win: ref.wins / ref.n, time: Math.round(ref.time), wallet: ref.pol.walletTarget + 1,
    baseLeft: Math.round(avg(wr.map(r => r.baseLeft)) * 100), minBase: Math.round(Math.min(1, ...wr.map(r => r.baseLeft)) * 100),
    minFront: Math.round(avg(ref.rs.map(r => r.minFront)) * 100), swings: Math.round(avg(ref.rs.map(r => r.swings)) * 10) / 10,
    peak: Math.round(avg(ref.rs.map(r => r.peak))), spawned: Math.round(avg(ref.rs.map(r => r.spawned))), lost: Math.round(avg(ref.rs.map(r => r.lost))),
    enemies: Math.round(avg(ref.rs.map(r => r.enemySpawned))), breath: Math.round(avg(ref.rs.map(r => r.breath)) * 10) / 10, rage: Math.round(avg(ref.rs.map(r => r.rage)) * 10) / 10,
    bossAt: Math.round(avg(ref.rs.filter(r => r.bossAt).map(r => r.bossAt))), firstHit: Math.round(avg(ref.rs.filter(r => r.firstHit).map(r => r.firstHit))),
    sloppy: sloppy.wins / sloppy.n, sloppyTime: Math.round(sloppy.time), sloppyBase: Math.round(avg(sloppy.rs.filter(r => r.win).map(r => r.baseLeft)) * 100), sloppyHit: Math.round(avg(sloppy.rs.map(r => r.baseLeft < 1 ? 1 : 0)) * 100),
    churn: Math.round(avg(ref.rs.map(r => r.lost / Math.max(1, r.spawned))) * 100), siege: Math.round(avg(wr.map(r => (r.time - (r.firstHit || r.time)) / r.time)) * 100), under2: under.wins / under.n, over2Time: Math.round(over.time),
    skillWin: skl.wins / skl.n, skillTime: Math.round(skl.time), noWallet: noW ? noW.wins / noW.n : null, noWalletTime: noW ? Math.round(noW.time) : null,
    flags,
  };
  if (out.win < 0.9) out.flags.push('기준 승률 낮음');
  if (out.time / out.target > 1.25) out.flags.push('목표보다 김');
  return out;
}

const res = {};
const t0 = Date.now();
for (let s = 1; s <= 10; s++) {
  const o = tuneStage(W, s); res[o.id] = o;
  console.log(o.id.padEnd(6), ('×' + o.mag).padEnd(7), 'max', String(o.magMax).padEnd(6), 'hp', String(o.baseHp).padEnd(7), 'T', String(o.time).padStart(3) + '/' + String(o.target).padEnd(3),
    'win', o.win, 'base', o.baseLeft + '%(min ' + o.minBase + ')', 'front', o.minFront + '%', 'sw', o.swings, 'wl', o.wallet, 'siege', o.siege + '%', 'churn', o.churn + '%', 'sloppy', o.sloppy + '/' + o.sloppyTime + 's/hit' + o.sloppyHit + '%', '-2lv', o.under2, 'skillT', o.skillTime, 'noW', o.noWallet, o.flags.join(' '));
}
fs.writeFileSync((process.env.OUT || 'tuned-w' + W) + '.json', JSON.stringify(res, null, 1));
console.log('world', W, 'done in', Math.round((Date.now() - t0) / 1000) + 's');
