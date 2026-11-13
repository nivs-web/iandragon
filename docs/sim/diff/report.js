'use strict';
// 결과 모으기 :  node report.js [--all]   →  표(마크다운) · out/summary.md · out/idgDifficulty.json · out/stages.hard.json · out/stages.master.json
// 합격선을 못 맞춘 판이 하나라도 있으면 「큰 소리로 실패」: 목록을 찍고 exit 1 (게임에 넣을 파일에는 fail 표시가 남는다)
const fs = require('fs'), path = require('path');
const L = require('./lib');
const OUT = path.join(__dirname, process.env.OUT || 'out'), ALL = process.argv.includes('--all');
const rd = (mode, g) => { try { return JSON.parse(fs.readFileSync(path.join(OUT, `${mode}-${g}.json`), 'utf8')); } catch (e) { return null; } };
const p = r => (r ? Math.round(r.rate * 100) + '%' : '-');
const isSample = g => [1, 5, 0].includes(g % 10);
const lines = [], fails = [], missing = { hard: [], master: [] };
const say = s => lines.push(s);
const H = [], M = [];
for (let g = 1; g <= 100; g++) { const h = rd('hard', g), m = rd('master', g); if (h) H.push(h); else missing.hard.push(g); if (m) M.push(m); else missing.master.push(g); }

// 합격선 (문서 B-3). 띠는 48씨앗 검증값, 확인은 다른 24씨앗
const chk = {
  hard: o => [
    [o.edge, '맞춤 범위 끝에 닿음'],
    [o.rec.rate < 0.70 || o.rec.rate > 0.85, `권장 ${p(o.rec)} (70~85% 밖)`],
    [o.conf && (o.conf.rate < 0.55 || o.conf.rate > 0.96), `확인 씨앗 ${p(o.conf)} (55~96% 밖)`],
    [o.rec.to / o.rec.n > 0.25, `시간 초과 패배 ${o.rec.to}/${o.rec.n}`],
  ],
  master: o => [
    [o.edge, '맞춤 범위 끝에 닿음'],
    [o.best.rate < 0.35 || o.best.rate > 0.60, `최고 ${p(o.best)} (35~60% 밖)`],
    [o.best.rate < 0.25 || (o.conf && o.conf.rate < 0.25), `최고 정책 25% 바닥 미달 (검증 ${p(o.best)} · 확인 ${p(o.conf)})`],
    [Math.max(o.norm.rate, o.norm2.rate) > o.best.rate, `보통 정책(${p(o.norm)} · ${p(o.norm2)})이 최고(${p(o.best)})보다 높음`],
    [o.none.rate > 0.05, `안 키움 ${p(o.none)} (5% 넘음)`],
    [o.sloppy.rate > o.best.rate + 0.12, `서툰(${p(o.sloppy)})이 최고(${p(o.best)})보다 높음 → 최고 정책을 못 찾음`],
    [!o.x, '교차 검사 안 함'],
    [o.x && o.x.top > o.x.own + 0.12, `교차 검사 : 다른 판의 구성(${o.x && o.x.from})이 ${o.x && Math.round(o.x.top * 100)}% · 내 구성 ${o.x && Math.round(o.x.own * 100)}% → 최고 정책을 못 찾음`],
    [!(o.rule === 3 || (o.w <= 2 && o.rule === 2)), '옛 규칙(굳센 방패 없음)으로 맞춘 값'],
  ],
};
for (const [mode, arr] of [['hard', H], ['master', M]]) for (const o of arr) { const bad = chk[mode](o).filter(c => c[0]).map(c => c[1]); o.bad = bad; if (bad.length) fails.push(`${mode} ${o.id} : ${bad.join(' / ')}`); }

const avg = (arr, f) => arr.length ? Math.round(arr.reduce((a, o) => a + f(o), 0) / arr.length * 100) + '%' : '-';
say(`### 어려움 (${H.length}/100판)`);
say('| 판 | 종류 | 체력 배율 | 공격 배율 | 성문 | 제한 | 권장 | 확인 | 절반 | 안 키움 | 최대 | 서툰 | 이기는 시간 | 기준 AI | 판정 |');
say('|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|');
for (const o of H) if (ALL || isSample(o.g)) say(`| ${o.id} | ${o.gim || o.type} | ${o.mag}${o.refit ? ' ↻' : ''} | ${o.atkMag}${o.atkMag < o.mag * 2 - 0.05 ? ' (뚜껑)' : ''} | ${o.baseHp} | ${o.limit}초 | ${p(o.rec)} | ${p(o.conf)} | ${p(o.half)} | ${p(o.none)} | ${p(o.max)} | ${p(o.sloppy)} | ${o.par}초 | 화로${o.cfg.wt} 브${o.cfg.bm}${o.cfg.sloppy ? ' 무작위' : ''} | ${o.bad.length ? '실패' : '합격'} |`);
say(`| 평균(${H.length}판) | | | | | | ${avg(H, o => o.rec.rate)} | ${avg(H.filter(o => o.conf), o => o.conf.rate)} | ${avg(H, o => o.half.rate)} | ${avg(H, o => o.none.rate)} | ${avg(H, o => o.max.rate)} | ${avg(H, o => o.sloppy.rate)} | | | 실패 ${H.filter(o => o.bad.length).length} |`);
say('');
say(`### 초고수 (${M.length}/100판)`);
say('| 판 | 종류 | 체력 배율 | 공격 배율 | 성문 | 최고 정책 | 확인 | 보통 정책 | 기준 AI | 키우기 90% | 키우기 80% | 안 키움 | 서툰 | 이기는 시간 | 이 판의 열쇠(최고 정책) | 판정 |');
say('|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|');
const keyOf = o => `${L.D.leaders[o.cfg.leader] ? (L.D.leaders[o.cfg.leader].ko || L.D.leaders[o.cfg.leader].name || o.cfg.leader) : o.cfg.leader} · 화로 ${o.cfg.wt} · 브레스 ${o.cfg.bm} · 덱 ${o.cfg.deck.length}장${o.cfg.react < 0.5 ? ' · 빠른 손' : ''}${o.cfg.sloppy ? ' · 섞어 뽑기' : ''}`;
for (const o of M) if (ALL || isSample(o.g)) say(`| ${o.id} | ${o.gim || o.type} | ${o.mag}${o.refit ? ' ↻' : ''}${o.xswap ? ' ⇄' : ''} | ${o.atkMag} | ${o.baseHp} | ${p(o.best)} | ${p(o.conf)} | ${p(o.norm)} | ${p(o.norm2)} | ${p(o.p90)} | ${p(o.p80)} | ${p(o.none)} | ${p(o.sloppy)} | ${o.par}초 | ${keyOf(o)} | ${o.bad.length ? '실패' : '합격'} |`);
say(`| 평균(${M.length}판) | | | | | ${avg(M, o => o.best.rate)} | ${avg(M.filter(o => o.conf), o => o.conf.rate)} | ${avg(M, o => o.norm.rate)} | ${avg(M, o => o.norm2.rate)} | ${avg(M, o => o.p90.rate)} | ${avg(M, o => o.p80.rate)} | ${avg(M, o => o.none.rate)} | ${avg(M, o => o.sloppy.rate)} | | | 실패 ${M.filter(o => o.bad.length).length} |`);
say('');
// 월드별 요약 (100판 전체)
say('### 월드별 요약');
say('| 월드 | 어려움 배율(최소~최대) | 어려움 권장 | 절반 | 안 키움 | 초고수 배율(최소~최대) | 초고수 최고 | 보통 정책 | 90% | 80% | 최저 「최고 정책」 승률 |');
say('|---|---|---|---|---|---|---|---|---|---|---|');
for (let w = 1; w <= 10; w++) {
  const h = H.filter(o => o.w === w), m = M.filter(o => o.w === w);
  const rg = a => a.length ? `${Math.min(...a.map(o => o.mag))} ~ ${Math.max(...a.map(o => o.mag))} (${a.length}판)` : '-';
  say(`| ${w} | ${rg(h)} | ${avg(h, o => o.rec.rate)} | ${avg(h, o => o.half.rate)} | ${avg(h, o => o.none.rate)} | ${rg(m)} | ${avg(m, o => o.best.rate)} | ${avg(m, o => Math.max(o.norm.rate, o.norm2.rate))} | ${avg(m, o => o.p90.rate)} | ${avg(m, o => o.p80.rate)} | ${m.length ? Math.round(Math.min(...m.map(o => Math.min(o.best.rate, o.conf ? o.conf.rate : 1))) * 100) + '%' : '-'} |`);
}
say('');
let timing = null; try { timing = JSON.parse(fs.readFileSync(path.join(OUT, 'timing.json'), 'utf8')); } catch (e) {}
const simsOf = a => a.reduce((x, o) => x + o.sims, 0), secOf = a => Math.round(a.reduce((x, o) => x + o.sec, 0));
say(`계산량 : 어려움 ${simsOf(H)}판(프로세스 시간 합 ${secOf(H)}초) · 초고수 ${simsOf(M)}판(${secOf(M)}초)` + (timing ? ` · 벽시계 ${JSON.stringify(timing.phases)}${timing.total ? ' · 전부 ' + timing.total + '초' : ''} · 일꾼 ${timing.workers}` : ''));
if (missing.hard.length || missing.master.length) say(`아직 없는 판 : 어려움 ${missing.hard.length} · 초고수 ${missing.master.length}`);
say(fails.length ? `\n**실패 ${fails.length}판**\n` + fails.map(f => '- ' + f).join('\n') : '\n합격선 미달 없음');

// 게임에 넣을 파일
const stars = o => ({ star3: Math.round(o.par * 1.07), star2: Math.min(o.limit - 5, Math.round(o.par * 1.27)) });
const data = { ver: 1, made: new Date().toISOString().slice(0, 10), build: { max: L.BUILD.max, rec: L.REC }, stages: {} };
const full = { hard: [], master: [] };
for (const [mode, arr] of [['hard', H], ['master', M]]) for (const o of arr) {
  const e = { mag: o.mag, atkMag: o.atkMag, baseHp: o.baseHp, limit: o.limit, par: o.par, ...stars(o) };
  if (mode === 'master') e.key = { leader: o.cfg.leader, wt: o.cfg.wt, deck: o.cfg.deck };
  if (o.bad.length) e.fail = o.bad;
  (data.stages[o.id] = data.stages[o.id] || {})[mode] = e;
  const st = L.variant(o.g, mode, o.mag); Object.assign(st, stars(o), { par: o.par });
  full[mode].push(st);
}
// 게임이 읽는 판 정의 (docs/sim/stages.hard.generated.json · stages.master.generated.json) — 보통 stages.generated.json 과 같은 모양 + diff (초고수는 key).
// reward 는 보통 같은 판의 것을 그대로(난이도 배율은 게임 코드가 곱한다) · unlocks 는 없음 · fail 이 있으면 합격선 미달 판.
// mag · atkMag 는 최종값이다 — 게임은 난이도 배율을 또 곱하지 않는다.
const ORDER = ['id', 'g', 'w', 's', 'name', 'type', 'gim', 'diff', 'length', 'mag', 'atkMag', 'baseHp', 'limit', 'fever', 'par', 'star2', 'star3', 'expLevel', 'reward', 'unlocks'];
const gen = { hard: [], master: [] };
for (const mode of ['hard', 'master']) for (const st of full[mode]) {
  const b = L.stages[st.g - 1], e = data.stages[st.id][mode], o = { ...st, reward: { ...b.reward }, unlocks: [] };
  if (e.key) o.key = e.key;
  if (e.fail) o.fail = e.fail;
  const out = {};
  for (const k of ORDER) out[k] = o[k];
  for (const k of Object.keys(o)) if (!(k in out) && k !== 'lines') out[k] = o[k];
  out.lines = o.lines;
  gen[mode].push(out);
}
if (H.length === 100 && M.length === 100) for (const mode of ['hard', 'master']) fs.writeFileSync(path.join(__dirname, '..', `stages.${mode}.generated.json`), JSON.stringify(gen[mode]));
fs.writeFileSync(path.join(OUT, 'idgDifficulty.json'), JSON.stringify(data));
fs.writeFileSync(path.join(OUT, 'stages.hard.json'), JSON.stringify(full.hard));
fs.writeFileSync(path.join(OUT, 'stages.master.json'), JSON.stringify(full.master));
fs.writeFileSync(path.join(OUT, 'summary.md'), lines.join('\n') + '\n');
console.log(lines.join('\n'));
if (fails.length || missing.hard.length || missing.master.length) { console.error(`\n!!!! 실패 : 합격선 미달 ${fails.length}판 · 빠진 판 ${missing.hard.length + missing.master.length} !!!!`); process.exit(1); }
