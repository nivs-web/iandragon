// 이안 드래곤 — 골든 파일(정답표) 뽑기 : 게임 쪽 전투 코어가 이 계산기와 "같은 결과"를 내는지 검사하는 기준.
//   node golden.js            → golden.json (300줄 = 스테이지 100 × 씨앗 3)
// 씨앗마다 다른 정책으로 돌려 코드 길을 넓게 덮는다 :
//   101 = 화로 Lv3 · 스킬 없음 (기준) / 102 = 화로 Lv1 · 스킬 씀 / 103 = 화로 Lv5 · 스킬 씀
// 한 줄 = { id, seed, load, policy, win, ticks, hash }  — load(편성) · policy 를 같이 적어 두어
// 게임 쪽 검사는 계산기의 refLoad 를 몰라도 그대로 다시 돌릴 수 있다.
'use strict';
const fs = require('fs'), path = require('path');
const D = require('./data');
const { refLoad } = require('./stages');
const { simulate, hashState } = require('./engine');
const stages = require('./stages.generated.json');

const RUNS = [
  { seed: 101, skills: false, policy: { walletTarget: 3, useSkills: false } },
  { seed: 102, skills: true, policy: { walletTarget: 1, useSkills: true } },
  { seed: 103, skills: true, policy: { walletTarget: 5, useSkills: true } },
];

const rows = [];
let wins = 0;
for (const st of stages) {
  for (const r of RUNS) {
    const load = refLoad(st, { skills: r.skills });
    let hash = 0;
    const out = simulate(st, load, D, r.policy, r.seed, (S) => { if (S.over) hash = hashState(S); });
    rows.push({ id: st.id, seed: r.seed, load, policy: r.policy, win: out.win, ticks: Math.round(out.time * 30), hash });
    if (out.win) wins++;
  }
}
fs.writeFileSync(path.join(__dirname, 'golden.json'), JSON.stringify(rows));
console.log(`golden.json : ${rows.length}판 · 승 ${wins}`);
