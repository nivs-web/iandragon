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

// ── 어려움 · 초고수 (2026-11-13 난이도 기획) → golden.diff.json  (보통 300판 golden.json 은 위에서 그대로 — 이 아래는 그 파일을 건드리지 않는다)
// stages.hard.generated.json · stages.master.generated.json 에서 월드마다 1 · 5 · 10 판 = 난이도마다 30줄. 씨앗 201 · 202 · 203 을 돌려 쓴다.
// 편성은 맞춤 프로그램(diff/lib.js 의 mkLoad · polOf)과 같은 꼴 : 어려움 = 월드 권장 키우기 · 기본 덱 / 초고수 = 최대 키우기 · 그 판의 열쇠(key) 리더 · 덱 · 화로.
// D 는 data.js 그대로(초강력 브레스 없음) — 게임 쪽 qa:idg-core 가 같은 D 로 대조한다.
const DIFFS = [['hard', 'stages.hard.generated.json'], ['master', 'stages.master.generated.json']];
if (DIFFS.every(([, f]) => fs.existsSync(path.join(__dirname, f)))) {
  const L = require('./diff/lib');
  const drows = [];
  let dw = 0;
  for (const [mode, f] of DIFFS) {
    const list = require('./' + f).filter(st => [1, 5, 10].includes(st.s));
    list.forEach((st, i) => {
      const seed = 201 + (i % 3);
      const cfg = mode === 'master' ? { leader: st.key.leader, deck: st.key.deck, wt: st.key.wt } : { wt: [3, 1, 5][i % 3] };
      const load = L.mkLoad(st, mode === 'master' ? L.BUILD.max : L.recOf(st.w), cfg), policy = L.polOf(cfg);
      let hash = 0;
      const out = simulate(st, load, D, policy, seed, (S) => { if (S.over) hash = hashState(S); });
      drows.push({ diff: mode, id: st.id, seed, load, policy, win: out.win, ticks: Math.round(out.time * 30), hash });
      if (out.win) dw++;
    });
  }
  fs.writeFileSync(path.join(__dirname, 'golden.diff.json'), JSON.stringify(drows));
  console.log(`golden.diff.json : ${drows.length}판(어려움 · 초고수) · 승 ${dw}`);
}
