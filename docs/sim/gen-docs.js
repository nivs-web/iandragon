// 이안 드래곤 — 표 문서 생성기
//   node gen-docs.js        → ../IAN_DRAGON_DATA.md  +  stages.generated.json
// data.js(수치) · stages.js(스테이지 설계도) · tuned.json(조율 결과)을 읽어 사람이 보는 표와, 게임 본체가 그대로 읽을 스테이지 정의를 만든다.
// tuned-w<월드>.json 이 옆에 있으면(= tune.js 를 다시 돌렸으면) tuned.json 에 덮어 합친다.
'use strict';
const fs = require('fs'), path = require('path');
const D = require('./data');
const S = require('./stages');
const { levelMul, formOf, powerMul, K } = require('./engine');

// ── 조율 결과 합치기
const tunedPath = path.join(__dirname, 'tuned.json');
const tuned = fs.existsSync(tunedPath) ? JSON.parse(fs.readFileSync(tunedPath, 'utf8')) : {};
for (let w = 1; w <= S.WORLDS.length; w++) {
  const p = path.join(__dirname, 'tuned-w' + w + '.json');
  if (fs.existsSync(p)) Object.assign(tuned, JSON.parse(fs.readFileSync(p, 'utf8')));
}
fs.writeFileSync(tunedPath, JSON.stringify(tuned, null, 1));

// ── 성장 · 경제(기획 확정값). 게임 본체 balance 로 그대로 옮긴다
const ECON = {
  lvCost: n => (n < 10 ? 100 * n : n < 20 ? 1000 + 250 * (n - 10) : 4000 + 500 * (n - 20)),   // 드래곤 Lv n → n+1 (코인)
  joinLv: [1, 2, 4, 6, 8, 10, 12, 14, 16, 18],          // 월드 w 에서 받는 드래곤(스토리 · 뽑기 공통)의 시작 레벨
  squadMul: 2,                                          // 용사단 레벨(기지 체력 · 브레스 · 스킬 피해) 값 = 드래곤 레벨 값 × 2
  labCost: n => 300 * (n + 1),                          // 연구소 한 항목 Lv n → n+1
  labStats: 7, labMax: 9,
  coin: g => 400 + 85 * g,                              // 첫 클리어 코인
  starBonus: 0.25,                                      // 새 별 하나마다 첫 클리어 코인의 25%
  replay: 0.4,                                          // 다시 깨면 40%
  goldBonus: 0.05,                                      // 황금 좀비 한 마리 = 그 스테이지 첫 클리어 코인의 5%
  gem: { star: 5, mid: 20, boss: 50 },                  // 별 하나 5 · 중간 보스 첫 클리어 20 · 월드 보스 첫 클리어 50
  capAt: [[0, 10], [20, 15], [40, 20], [60, 25], [80, 30]],   // [이 스테이지(g)를 깨면, 레벨 상한]
};
const sumLv = (a, b, mul) => { let t = 0; for (let n = a; n < b; n++) t += ECON.lvCost(n) * (mul || 1); return t; };
const sumLab = lv => { let t = 0; for (let n = 0; n < lv; n++) t += ECON.labCost(n); return t; };
const worldOfG = g => Math.ceil(g / 10);

// ── 글자 도우미
const TR = { red: '빨강', wing: '날개', ice: '얼음', metal: '강철', ghost: '유령', giant: '거대', shadow: '그림자', crystal: '수정' };
const tr = a => a.map(t => TR[t] || t).join('·');
const pct = v => Math.round(v * 100) + '%';
const num = v => String(v).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
const r1 = v => Math.round(v * 10) / 10;
function abil(d) {
  const a = [];
  if (d.area) a.push('범위' + (d.splash ? '(사거리 뒤 ' + d.splash + '까지)' : ''));
  if (d.ld) a.push('먼 곳만 때림(' + d.ld[0] + '~' + d.ld[1] + ')');
  if (d.wave) a.push('파동(맞은 적 뒤 ' + d.wave + '까지 관통)');
  if (d.blast) a.push('자폭(둘레 ' + d.blast + ')');
  if (d.strong) a.push(tr(d.strong) + '에 강함');
  if (d.massive) a.push(tr(d.massive) + '에 3배');
  if (d.tough) a.push(tr(d.tough) + '에게 받는 피해 1/4');
  if (d.knock) a.push('밀치기 ' + pct(d.knock) + (d.knockVs ? '(' + tr(d.knockVs) + '만)' : ''));
  if (d.slow) a.push('느리게 ' + pct(d.slow.chance) + '·' + d.slow.time + '초');
  if (d.freeze) a.push('얼리기 ' + pct(d.freeze.chance) + '·' + d.freeze.time + '초');
  if (d.weaken) a.push('약화 ' + pct(d.weaken.chance) + '·' + d.weaken.time + '초');
  if (d.crit) a.push('치명타 ' + pct(d.crit));
  if (d.breaker) a.push('방어막 깨기 ' + pct(d.breaker));
  if (d.purify) a.push('정화');
  if (d.baseKiller) a.push('기지에 4배');
  if (d.survive) a.push('한 번 버티기');
  if (d.bounty2) a.push('잡으면 불씨 2배');
  if (d.kbImmune) a.push('안 밀림');
  if (d.metal) a.push('강철 몸');
  if (d.revive) a.push('되살아남(' + d.revive.delay + '초 뒤 · 체력 ' + pct(d.revive.hp) + ')');
  if (d.burrow) a.push('땅굴(아군 맨 앞보다 ' + d.burrow + ' 뒤에서 튀어나옴)');
  if (d.poison) a.push('독(+최대 체력의 ' + pct(d.poison) + ')');
  if (d.barrier) a.push('방어막 ' + d.barrier);
  if (d.onDeath) a.push('쓰러지면 ' + D.enemies[d.onDeath.id].name + ' ' + d.onDeath.count + '마리');
  if (d.gold) a.push('코인 보너스');
  return a.join(' · ') || '—';
}
const FORM_KEYS = ['cd', 'speed', 'range', 'splash', 'blast', 'wave'];
function formDiff(base, f) {                              // 진화에서 바뀌는 것만
  const a = [];
  for (const k of FORM_KEYS) if (f[k] != null) a.push({ cd: '쿨', speed: '속도', range: '사거리', splash: '범위 깊이', blast: '폭발 둘레', wave: '파동' }[k] + ' ' + (base[k] != null ? base[k] + '→' : '') + f[k]);
  const rest = {}; for (const k in f) if (k !== 'name' && !FORM_KEYS.includes(k)) rest[k] = f[k];
  if (f.wave != null && base.wave == null) { a.pop(); rest.wave = f.wave; }
  const t = abil(rest); if (t !== '—') a.push(t);
  return a.join(' · ');
}
const table = (head, rows) => ['| ' + head.join(' | ') + ' |', '|' + head.map(() => '---').join('|') + '|', ...rows.map(r => '| ' + r.join(' | ') + ' |')].join('\n');

// ── 스테이지 깨면 열리는 것
const FEATURE = { 1: '화로 올리기', 3: '훈련소(레벨업)', 5: '2배속', 6: '스킬 칸 1', 15: '알 부화장 · 스킬 칸 2', 10: '보물 · 연구소', 30: '3배속' };
function unlocksAfter(g) {
  const a = [];
  for (const u of S.UNLOCK) if (u[1] === g) a.push('용 「' + D.units[u[0]].name + '」');
  for (const u of S.SKILL_UNLOCK) if (u[1] === g) a.push('스킬 「' + D.skills[u[0]].name + '」');
  if (g % 10 === 0) for (const id in D.leaders) if (D.leaders[id].unlock === g / 10) a.push('리더 ' + D.leaders[id].ko);
  if (g % 10 === 0 && g >= 20 && g <= 60) a.push('덱 칸 +1');
  for (const c of ECON.capAt) if (c[0] === g && g > 0) a.push('레벨 상한 ' + c[1]);
  if (FEATURE[g]) a.push(FEATURE[g]);
  return a;
}

// ── 스테이지 정의(조율값 적용) + 별 · 보상
const TYPE_KO = { boss: '월드 보스', rush: '보스 러시', mid: '중간 보스', gimmick: '기믹', swarm: '떼', normal: '일반' };
const stages = S.buildStages().map(st => {
  const t = tuned[st.id];
  if (!t) throw new Error('조율값 없음 : ' + st.id);
  const limit = st.limit || 300, par = t.time;
  // ★★★ = 기준 시간 +5% (5초 올림) · ★★ = 기준 시간 +40% (적어도 ★★★ +10초, 많아도 제한 −10초)
  let star3 = Math.ceil(par * 1.05 / 5) * 5;
  const star2 = Math.min(Math.max(Math.ceil(par * 1.4 / 5) * 5, star3 + 10), limit - 10);
  star3 = Math.min(star3, star2 - 10);
  const coins = ECON.coin(st.g), gems = st.type === 'boss' ? ECON.gem.boss : st.type === 'mid' ? ECON.gem.mid : 0;
  const lines = st.lines.map(l => { const o = Object.assign({}, l); delete o.wave; return o; });
  const out = { id: st.id, g: st.g, w: st.w, s: st.s, name: st.name, type: st.type, gim: st.gim, length: st.length,
    mag: t.mag, atkMag: t.atkMag, baseHp: t.baseHp, limit, fever: st.fever || 120, par, star2, star3, expLevel: S.expLevel(st.g),
    reward: { coins, gems }, unlocks: unlocksAfter(st.g), lines };
  for (const k of ['capAlly', 'walletLock', 'costMax', 'startMoney', 'allySpeed', 'enemySpeed', 'fog']) if (st[k] != null) out[k] = st[k];
  return out;
});
fs.writeFileSync(path.join(__dirname, 'stages.generated.json'), JSON.stringify(stages));

// ── 경제 점검 : 월드 보스 앞에서 "기준 빌드"를 맞추는 데 드는 코인 vs 그때까지 번 코인
function needAt(g) {                                      // g 스테이지에 기대 레벨로 들어가려면
  const lv = S.expLevel(g), w = worldOfG(g);
  let units = 0;
  for (const u of S.UNLOCK) if (u[1] < g) units += sumLv(ECON.joinLv[Math.max(0, worldOfG(Math.max(1, u[1] + 1)) - 1)], lv);
  const squad = sumLv(1, lv, ECON.squadMul), lab = ECON.labStats * sumLab(w - 1);
  return { units, squad, lab, total: units + squad + lab };
}
const earnedBefore = (g, stars) => { let t = 0; for (let i = 1; i < g; i++) t += ECON.coin(i) * (1 + ECON.starBonus * (stars - 1)); return Math.round(t); };

// ══ 문서 쓰기
const L = [];
const P = s => L.push(s);
P('# 이안 드래곤 — 데이터 표');
P('');
P('> **자동 생성 파일입니다.** `docs/sim/gen-docs.js` 가 `data.js` · `stages.js` · `tuned.json` 에서 만듭니다. 숫자를 바꾸려면 원본을 고치고 `node gen-docs.js` 를 다시 돌리세요.');
P('> 규칙 설명은 [IAN_DRAGON_GDD.md](IAN_DRAGON_GDD.md), 게임 본체가 읽을 스테이지 정의 전체는 [sim/stages.generated.json](sim/stages.generated.json) 에 있습니다.');
P('> 단위 : 거리 wu (도트 1칸 = 2wu) · 시간 초(1배속) · 드래곤은 Lv1, 좀비는 배율 1.0 기준.');
P('');

P('## 1. 화로 (판마다 Lv1 에서 시작)');
P('');
P(table(['화로 Lv', '초당 불씨', '최대 보유', '다음 레벨 값'], D.wallet.map((w, i) => [i + 1, w.income, num(w.max), w.cost ? num(w.cost) : '최대'])));
P('');
P('시작 불씨 ' + D.startMoney + ' · 내 기지 체력 ' + num(D.playerBaseHp) + ' × 용사단 레벨 배율 · Lv1→8 까지 다 올리면 불씨 ' + num(D.wallet.reduce((a, w) => a + w.cost, 0)) + '.');
P('');

P('## 2. 레벨 배율과 레벨업 값');
P('');
P('체력 · 공격 = Lv1 수치 × 레벨 배율 × 진화 배율. 진화 : Lv10 에서 2단계(×1.2), Lv20 에서 3단계(×1.5).');
P('');
{
  const rows = []; let cum = 0;
  for (let lv = 1; lv <= 30; lv++) {
    rows.push([lv, r1(levelMul(lv) * 100) / 100, ['1단계', '2단계', '3단계'][formOf(lv)], Math.round(powerMul(lv) * 100) / 100, lv < 30 ? num(ECON.lvCost(lv)) : '—', num(cum)]);
    cum += ECON.lvCost(lv);
  }
  P(table(['Lv', '레벨 배율', '진화', '최종 배율', '다음 레벨 코인', 'Lv1 부터 누적'], rows));
}
P('');
P('- 새로 받는 드래곤의 시작 레벨 (월드 1~10) : ' + ECON.joinLv.join(' · ') + ' — 늦게 받은 용을 처음부터 키우지 않게.');
P('- 용사단 레벨(기지 체력 · 브레스 · 스킬 피해) 값 = 위 표 × ' + ECON.squadMul + '.');
P('- 연구소 : 항목 ' + ECON.labStats + '개 · Lv0→' + ECON.labMax + ' · Lv n→n+1 값 = 300 × (n+1) · 상한 = 깬 월드 수.');
P('- 레벨 상한 : ' + ECON.capAt.map(c => (c[0] ? Math.round(c[0] / 10) + '월드 클리어 → ' : '처음 ') + c[1]).join(' · ') + '.');
P('');

function unitRows(rar) {
  return Object.entries(D.units).filter(([, u]) => (rar === 'story' ? u.rar === 'story' : u.rar !== 'story')).map(([id, u]) => {
    const dps = u.atk / (u.fore + u.back);
    const got = rar === 'story' ? (() => { const g = S.UNLOCK.find(x => x[0] === id)[1]; return g === 0 ? '처음부터' : worldOfG(g) + '-' + (g - (worldOfG(g) - 1) * 10) + ' 클리어'; })() : { rare: '희귀', super: '슈퍼', legend: '전설' }[u.rar];
    return [u.name, '`' + id + '`', u.role, u.cost, u.cd, u.hp, u.atk, u.range, u.speed, u.fore + '/' + u.back, u.kbImmune ? '—' : u.kb, Math.round(dps), Math.round(dps / u.cost * 100), Math.round(u.hp / u.cost * 100), abil(u), got];
  });
}
const UH = ['이름', 'id', '역할', '불씨', '쿨', '체력', '공격', '사거리', '속도', '선/후딜', '넉백 수', '초당 피해', '불씨100당 피해', '불씨100당 체력', '능력', ''];
const formRows = rar => Object.entries(D.units).filter(([, u]) => (rar === 'story' ? u.rar === 'story' : u.rar !== 'story')).map(([, u]) => [u.name, u.forms[1].name, formDiff(u, u.forms[1]), u.forms[2].name, formDiff(Object.assign({}, u, u.forms[1]), u.forms[2])]);

P('## 3. 스토리 드래곤 12 (뽑기 없이 받는다)');
P('');
UH[UH.length - 1] = '받는 때';
P(table(UH, unitRows('story')));
P('');
P('**진화** (능력은 누적된다)');
P('');
P(table(['1단계', '2단계 (Lv10)', '2단계에서 더해지는 것', '3단계 (Lv20)', '3단계에서 더해지는 것'], formRows('story')));
P('');

P('## 4. 알 뽑기 드래곤 11 (없어도 100스테이지를 깰 수 있다)');
P('');
UH[UH.length - 1] = '등급';
P(table(UH, unitRows('gacha')));
P('');
P(table(['1단계', '2단계 (Lv10)', '2단계에서 더해지는 것', '3단계 (Lv20)', '3단계에서 더해지는 것'], formRows('gacha')));
P('');
P('능력 풀이 — 강함 : 주는 피해 ×1.5 · 받는 피해 ×0.5 / 3배 : 주는 피해 ×3 / 받는 피해 1/4 / 치명타 : 피해 ×2, 강철 몸을 뚫는다 / 정화 : 이 용에게 쓰러진 유령은 되살아나지 못한다 / 한 번 버티기 : 죽을 피해를 한 번 체력 1로 버틴다 / 넉백 수 : 체력이 그 수만큼 나뉜 구간을 넘을 때마다 뒤로 밀린다.');
P('');

P('## 5. 좀비 ' + Object.values(D.enemies).filter(e => !e.boss).length + ' + 월드 보스 ' + Object.values(D.enemies).filter(e => e.boss).length);
P('');
P('실제 체력 = 표의 체력 × 스테이지 체력 배율, 실제 공격 = 표의 공격 × 스테이지 공격 배율 (9장 표). 방어막 수치도 체력 배율을 따른다.');
P('');
const EH = ['이름', 'id', '월드', '체력', '공격', '사거리', '속도', '선/후딜', '넉백 수', '불씨', '속성', '특수'];
const erow = ([id, e]) => [e.name, '`' + id + '`', e.w || '보너스', num(e.hp), e.atk, e.range, e.speed, e.fore + '/' + e.back, e.kbImmune ? '—' : e.kb, num(e.bounty), e.traits ? tr(e.traits) : '—', abil(e)];
P(table(EH, Object.entries(D.enemies).filter(([, e]) => !e.boss).map(erow)));
P('');
P('**월드 보스**');
P('');
P(table(EH, Object.entries(D.enemies).filter(([, e]) => e.boss).map(erow)));
P('');

P('## 6. 리더 10 (기지 위의 대장 — 브레스 + 패시브)');
P('');
{
  const PK = { hp: '아군 체력', atk: '아군 공격', income: '불씨 생산', baseHp: '기지 체력', cooldown: '생산 속도', bounty: '처치 불씨' };
  P(table(['리더', 'id', '받는 때', '충전(초)', '피해', '닿는 거리', '브레스 효과', '패시브', '한 줄'], Object.entries(D.leaders).map(([id, l]) => {
    const fx = [];
    if (l.kb) fx.push('밀치기 ×' + l.kb); if (l.slow) fx.push('느리게 ' + l.slow + '초'); if (l.freeze) fx.push('얼리기 ' + l.freeze + '초'); if (l.weaken) fx.push('약화 ' + l.weaken + '초');
    if (l.strongVs) fx.push(tr(l.strongVs) + '에 2배'); if (l.trueDmg) fx.push('강철 · 방어막 무시'); if (l.focus) fx.push('체력 제일 많은 적에게 ×' + l.focus); if (l.purify) fx.push('정화'); if (l.bountyMul) fx.push('브레스 처치 불씨 ×' + l.bountyMul);
    const pv = Object.entries(l.passive || {}).map(([k, v]) => PK[k] + ' +' + Math.round((v - 1) * 100) + '%').join(' · ') || '—';
    return [l.ko + ' ' + l.name, '`' + id + '`', l.unlock === 0 ? '처음부터' : l.unlock + '월드 클리어', l.charge, l.dmg, l.range, fx.join(' · '), pv, l.line];
  })));
}
P('');
P('브레스 피해 = 표의 피해 × 용사단 레벨 배율 × 연구소 · 보물 보너스. 닿는 거리는 내 기지에서부터 잰다.');
P('');

P('## 7. 스킬 3 (2칸 장착)');
P('');
P(table(['스킬', 'id', '받는 때', '판당 횟수', '재사용(초)', '첫 사용(초)', '효과'], Object.entries(D.skills).map(([id, s]) => {
  const g = S.SKILL_UNLOCK.find(x => x[0] === id)[1];
  return [s.name, '`' + id + '`', worldOfG(g) + '-' + (g - (worldOfG(g) - 1) * 10) + ' 클리어', s.charges, s.cd, s.first, s.line + (s.dmg ? ' (피해 ' + s.dmg + ' × 용사단 레벨 배율)' : '')];
})));
P('');

P('## 8. 월드 10');
P('');
{
  const en = id => D.enemies[id].name;
  P(table(['월드', '이름', '속성', '맞춤 리더(기준)', '잡졸 F', '빠른 놈 Q', '튼튼한 놈 T', '원거리 R', '대형 H', '특수 X', '중간 보스(5)', '월드 보스(10)', '기믹(4 · 7 · 9)', '꼭 챙길 용'], S.WORLDS.map(W => [
    W.n, W.name, W.traitKo, D.leaders[W.leader].ko,
    ...['F', 'Q', 'T', 'R', 'H', 'X'].map(r => en(W.roles[r]) + ' (' + W.n + '-' + W.intro[r] + '~)'),
    '대왕 ' + en(W.mid), en(W.boss), Object.entries(W.gim).map(([s, g]) => s + ': ' + S.GIM_KO[g]).join(' / '), W.must.map(id => D.units[id].name).join(' · ') || '—'])));
}
P('');

P('## 9. 스테이지 100');
P('');
P('체력 배율 · 공격 배율 = 그 스테이지 좀비 전부에 곱한다 (공격 배율 = 체력 배율 × ' + S.AR + '). 기준 시간 = 기준 빌드(그때까지 받은 스토리 용 · 기대 레벨 · 스킬 없음)로 자동 전투가 깬 평균 시간.');
P('★ 깨면 · ★★ 「★★」초 안에 · ★★★ 「★★★」초 안에. 제한 시간을 넘기면 진다.');
P('');
for (const W of S.WORLDS) {
  P('### 월드 ' + W.n + ' — ' + W.name + ' (' + W.traitKo + ')');
  P('');
  P(table(['#', '이름', '종류', '전장 길이', '체력 배율', '공격 배율', '적 기지 체력', '제한', '기준 시간', '★★', '★★★', '기대 Lv', '첫 클리어 코인', '젬', '깨면 열리는 것'], stages.filter(s => s.w === W.n).map(s => [
    s.id, s.name, TYPE_KO[s.type] + (s.gim && s.type !== 'rush' ? ' · ' + S.GIM_KO[s.gim] : ''), s.length, '×' + s.mag, '×' + s.atkMag, num(s.baseHp), s.limit, s.par, s.star2, s.star3, s.expLevel, num(s.reward.coins), s.reward.gems || '—', s.unlocks.join(' · ') || '—'])));
  P('');
}

P('## 10. 검증 성적표 (자동 전투 10판씩)');
P('');
P('- **승률** 기준 빌드 · **시간** 실제/목표 · **최저 전선** 아군 맨 앞이 가장 밀렸을 때의 위치(전장 길이 대비, 작을수록 아슬아슬) · **뒤집힘** 전선이 150wu 넘게 방향을 바꾼 횟수 · **화로** 제일 잘 통한 화로 목표 레벨');
P('- **공성** 적 기지만 두들긴 시간 비율(30% 넘으면 지루) · **소모** 뽑은 용 중 쓰러진 비율 · **막누름** 되는 대로 누르는 AI 의 승률 · **−2Lv** 레벨이 2 낮을 때 승률 · **화로 0** 화로를 한 번도 안 올렸을 때 승률');
P('');
P(table(['#', '종류', '승률', '시간', '최저 전선', '뒤집힘', '화로', '공성', '소모', '막누름', '−2Lv', '스킬 쓰면', '화로 0', '비고'], stages.map(s => {
  const t = tuned[s.id];
  return [s.id, TYPE_KO[s.type], t.win, t.time + '/' + t.target, t.minFront + '%', t.swings, 'Lv' + t.wallet, t.siege + '%', t.churn + '%', t.sloppy + (t.sloppy ? ' (' + t.sloppyTime + '초)' : ''), t.under2, t.skillTime + '초', t.noWallet == null ? '—' : t.noWallet, t.flags.join(' · ') || ''];
})));
P('');

P('## 11. 경제 점검');
P('');
P('월드 보스 앞에서 기준 빌드(스토리 용 전부 · 용사단 · 연구소를 기대 레벨까지)를 맞추는 데 드는 코인과, 그때까지 첫 클리어로 번 코인. 다시 깨기(' + pct(ECON.replay) + ') · 황금 좀비 · 임무 보상은 넣지 않았다 = 여유분.');
P('');
{
  const rows = [];
  for (let w = 1; w <= 10; w++) {
    const g = w * 10, n = needAt(g), e1 = earnedBefore(g, 1), e2 = earnedBefore(g, 2), e3 = earnedBefore(g, 3);
    rows.push([w + '-10', S.expLevel(g), num(n.units), num(n.squad), num(n.lab), num(n.total), num(e1), num(e2), num(e3), pct(n.total / e2)]);
  }
  P(table(['보스 앞', '기대 Lv', '드래곤', '용사단', '연구소', '필요 합계', '번 코인(★)', '번 코인(★★)', '번 코인(★★★)', '필요 ÷ ★★'], rows));
  const all = needAt(101);
  P('');
  P('100스테이지를 다 깼을 때 : 필요 ' + num(all.total) + ' · 첫 클리어 합계(★) ' + num(earnedBefore(101, 1)) + ' · (★★) ' + num(earnedBefore(101, 2)) + ' · (★★★) ' + num(earnedBefore(101, 3)) + '.');
  const gems = stages.reduce((a, s) => a + s.reward.gems, 0) + 300 * ECON.gem.star;
  const mids = stages.filter(s => s.reward.gems === ECON.gem.mid).length, bosses = stages.filter(s => s.reward.gems === ECON.gem.boss).length;
  P('젬 : 별 300개 × ' + ECON.gem.star + ' + 중간 보스 ' + mids + ' × ' + ECON.gem.mid + ' + 월드 보스 ' + bosses + ' × ' + ECON.gem.boss + ' = ' + num(gems) + ' (알 ' + Math.floor(gems / 100) + '~' + Math.floor(gems / 90) + '개 분량, 임무 · 매일 첫 승리 제외).');
}
P('');
fs.writeFileSync(path.join(__dirname, '..', 'IAN_DRAGON_DATA.md'), L.join('\n'));
console.log('IAN_DRAGON_DATA.md', L.length, 'lines ·', 'stages.generated.json', stages.length, 'stages');
for (let w = 1; w <= 10; w++) { const g = w * 10, n = needAt(g); console.log(('w' + w).padEnd(4), 'lv', String(S.expLevel(g)).padStart(2), 'need', String(n.total).padStart(7), 'earn★', String(earnedBefore(g, 1)).padStart(7), '★★', String(earnedBefore(g, 2)).padStart(7), 'ratio', (n.total / earnedBefore(g, 2)).toFixed(2)); }
