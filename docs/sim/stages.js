// 이안 드래곤 — 스테이지 100개 생성기 + 기준 빌드(이 스테이지에서 기대하는 덱 · 레벨 · 리더 · 보너스)
// 월드 10 × 스테이지 10. 월드마다 같은 "설계도"(1 소개 → … → 5 중간 보스 → … → 10 월드 보스)를 따른다.
// 200개로 늘릴 때는 WORLDS 에 11~20 을 덧붙이면 된다(설계도 · 조율기는 그대로).
'use strict';
const D = require('./data');

// 역할 : F 잡졸 · Q 빠른 놈 · T 튼튼한 놈 · R 원거리 · H 대형 · X 특수
// intro[역할] = 그 역할이 처음 나오는 스테이지 번호(월드 안에서 1~10)
const WORLDS = [
  { n: 1, name: '초록 언덕', trait: null, traitKo: '없음', leader: 'novart',
    roles: { F: 'walker', Q: 'pup', T: 'chubby', R: 'archer', H: 'shield', X: 'fart' }, intro: { F: 1, Q: 2, T: 3, R: 6, H: 8, X: 8 },
    mid: 'chubby', boss: 'bossFat', gim: { 4: 'gold', 7: 'race', 9: 'time' }, must: [] },
  { n: 2, name: '부글부글 화산', trait: 'red', traitKo: '빨강', leader: 'aquantis',
    roles: { F: 'walker', Q: 'skull', T: 'chili', R: 'archer', H: 'lava', X: 'bomb' }, intro: { F: 1, Q: 1, R: 2, T: 3, H: 6, X: 8 },
    mid: 'lava', boss: 'bossVolcano', gim: { 4: 'cap10', 7: 'lock', 9: 'rush' }, must: ['bangul'],
    rush: [['chubby', 3], ['chili', 3], ['lava', 3]] },
  { n: 3, name: '뭉게구름 하늘섬', trait: 'wing', traitKo: '날개', leader: 'forestia',
    roles: { F: 'bat', Q: 'pup', T: 'chubby', R: 'wingz', H: 'shield', X: 'balloon' }, intro: { F: 1, Q: 2, T: 2, R: 3, X: 6, H: 8 },
    mid: 'wingz', boss: 'bossRider', gim: { 4: 'wind', 7: 'fog', 9: 'gold' }, must: ['dungsil'] },
  { n: 4, name: '꽁꽁 얼음골', trait: 'ice', traitKo: '얼음', leader: 'crimsonde',
    roles: { F: 'walker', Q: 'penguin', T: 'snowball', R: 'icicle', H: 'shield', X: 'chili' }, intro: { F: 1, Q: 1, T: 2, R: 3, H: 6, X: 8 },
    mid: 'snowball', boss: 'bossAvalanche', gim: { 4: 'cost', 7: 'time', 9: 'cap8' }, must: ['bulttong', 'eoreum'], costMax: 300 },
  { n: 5, name: '덜컹덜컹 고철 광산', trait: 'metal', traitKo: '강철', leader: 'volttail',
    roles: { F: 'walker', Q: 'cart', T: 'can', R: 'archer', H: 'gear', X: 'bomb' }, intro: { F: 1, T: 1, Q: 2, H: 3, R: 6, X: 8 },
    mid: 'gear', boss: 'bossRobot', gim: { 4: 'money', 7: 'wind', 9: 'rush' }, must: ['jjirit'],
    rush: [['bossFat', 0.5], ['bossRider', 0.5], ['gear', 2.5]] },
  { n: 6, name: '으스스 유령 묘지', trait: 'ghost', traitKo: '유령', leader: 'solaris',
    roles: { F: 'ghost', Q: 'bat', T: 'bones', R: 'wingz', H: 'shield', X: 'mole' }, intro: { F: 1, Q: 1, T: 2, X: 3, R: 6, H: 8 },
    mid: 'bones', boss: 'bossGhost', gim: { 4: 'fog', 7: 'lock', 9: 'gold' }, must: ['banjjak'] },
  { n: 7, name: '모래바람 사막', trait: 'giant', traitKo: '거대', leader: 'sandscale',
    roles: { F: 'scarab', Q: 'skull', T: 'mummy', R: 'archer', H: 'golem', X: 'mole' }, intro: { F: 1, Q: 1, T: 2, R: 2, H: 3, X: 6 },
    mid: 'golem', boss: 'bossPharaoh', gim: { 4: 'fever', 7: 'cap10', 9: 'time' }, must: ['giljjuk', 'kungkwang'] },
  { n: 8, name: '끈적끈적 독 늪', trait: 'shadow', traitKo: '그림자 · 독', leader: 'shadowfen',
    roles: { F: 'walker', Q: 'shade', T: 'chubby', R: 'frog', H: 'shroom', X: 'ghost' }, intro: { F: 1, Q: 1, R: 2, T: 2, H: 3, X: 6 },
    mid: 'shroom', boss: 'bossWitch', gim: { 4: 'race', 7: 'cost', 9: 'rush' }, must: ['banjjak', 'eoreum'], costMax: 350,
    rush: [['bossVolcano', 0.5], ['bossGhost', 0.5], ['shroom', 3]] },
  { n: 9, name: '반짝반짝 수정 동굴', trait: 'crystal', traitKo: '수정', leader: 'volttail',
    roles: { F: 'shard', Q: 'penguin', T: 'crystal', R: 'prism', H: 'golem', X: 'can' }, intro: { F: 1, T: 2, Q: 2, R: 3, H: 6, X: 8 },
    mid: 'crystal', boss: 'bossCrystal', gim: { 4: 'lock', 7: 'fogwind', 9: 'gold' }, must: ['jjirit', 'kungkwang'] },
  { n: 10, name: '좀비 드래곤 성', trait: 'all', traitKo: '전부', leader: 'aquantis',
    roles: { F: 'walker', Q: 'shade', T: 'knight', R: 'dragonling', H: 'golem', X: 'bones' }, intro: { F: 1, Q: 1, T: 2, R: 3, H: 6, X: 8 },
    mid: 'knight', boss: 'bossLord', gim: { 4: 'cap10', 5: 'rush', 7: 'time', 9: 'eve' }, must: [],
    rush: [['bossAvalanche', 0.5], ['bossPharaoh', 0.5], ['bossCrystal', 0.5]] },
];

const NAMES = [
  ['첫 출동!', '화로에 불을 붙여라', '통통한 손님', '황금 좀비다, 잡아라!', '대왕 통통의 낮잠', '새총 조심!', '좀비 달리기 대회', '뿡! 방귀 대소동', '째깍째깍! 서둘러', '뚱보 좀비 대장'],
  ['뜨거운 첫걸음', '불타는 해골 폭주족', '매운맛 고추 좀비', '열 마리로 버텨라', '대왕 용암 덩이', '흐르는 용암길', '화로가 고장 났다', '펑! 폭탄 배달', '화산 운동회', '화산 좀비 킹'],
  ['구름 위의 박쥐떼', '뼈다귀 구름 산책', '하늘에서 쏜다', '맞바람이 분다', '대왕 날개 좀비', '풍선이 펑!', '안개 낀 하늘섬', '박쥐 대이동', '황금 구름 좀비', '좀비 라이더'],
  ['미끌미끌 펭귄', '눈덩이가 굴러온다', '고드름 사격장', '아껴 써야 해', '대왕 눈덩이', '꽁꽁 언 다리', '눈보라 속 달리기', '펭귄 썰매 부대', '여덟 마리 원정대', '눈사태 거인'],
  ['깡통이 굴러온다', '폭주 광차', '톱니 기사단', '용돈 듬뿍!', '대왕 톱니 기사', '녹슨 갱도', '환풍기 맞바람', '깡통 산사태', '고철 운동회', '고철 대왕 로봇'],
  ['흐물흐물 첫 유령', '다시 일어나는 해골', '땅 밑에서 불쑥!', '안개 낀 묘지', '대왕 해골 병사', '달밤의 박쥐', '꺼져 가는 화로', '묘지 대소동', '황금 유령?!', '유령 대왕'],
  ['풍뎅이 떼가 온다', '붕대 감은 미라', '꿈쩍 않는 골렘', '불꽃 타임 사막', '대왕 모래 골렘', '모래 속 땅굴', '열 마리 사막 횡단', '미라 행진', '모래시계가 떨어진다', '파라오 좀비'],
  ['그림자가 달린다', '개굴개굴 독침', '독버섯 밭', '늪지 달리기 대회', '대왕 독버섯', '유령 늪', '작은 용만 가자', '그림자 떼', '늪 운동회', '늪의 마녀'],
  ['반짝이는 박쥐', '단단한 수정 좀비', '프리즘 광선', '화로가 얼었다', '대왕 수정 좀비', '수정 골렘 길', '안개 낀 바람굴', '수정 깡통 창고', '황금 수정 좀비', '수정 드래곤 좀비'],
  ['성문 앞', '좀비 기사단', '새끼용의 불', '열 마리 결사대', '돌아온 대장들', '성벽 위 싸움', '시간이 없다', '왕좌로 가는 길', '마지막 밤', '좀비 드래곤 로드'],
];

const GIM_KO = {
  gold: '황금 좀비', race: '달리기 대회(적 속도 ×1.3)', time: '타임어택', cap10: '제한 출격 10', cap8: '제한 출격 8', lock: '화로 고정',
  rush: '보스 러시', wind: '맞바람(아군 속도 ×0.6)', fog: '안개', cost: '비용 제한', money: '용돈 듬뿍(+1500)', fever: '불꽃 타임(30초부터)',
  fogwind: '안개 + 맞바람(×0.7)', eve: '전야(모든 속성)',
};

// 적은 "물결"로 온다 : PERIOD 초마다 한 떼. 물결은 갈수록 커진다(k 번째 물결 = 첫 물결 × (1 + GROW × k)).
// 물결 사이에는 잡졸만 드문드문(TRICKLE) → 밀렸다가 밀어내는 리듬이 생기고, 오래 끌수록 불리해져서 판이 늘어지지 않는다.
const WAVE = { period: 20, first: 5, grow: 0.2, max: 15 };
const TRICKLE = [5, 7];
// 물결 하나의 기본 구성(밀도 1, 첫 물결) : n 마리 · 물결 시작 뒤 at 초부터 · gap 초 간격
const ROLE = { T: { n: 1, at: 0, gap: 1.2 }, H: { n: 0.34, at: 0, gap: 2 }, F: { n: 3, at: 0.5, gap: 0.6 },
               R: { n: 0.8, at: 1.5, gap: 1.0 }, Q: { n: 2, at: 2.5, gap: 0.5 }, X: { n: 0.5, at: 3, gap: 1.0 } };
// 스테이지 번호별 밀도(물결이 얼마나 큰가)
const DENS = [0, 0.75, 0.85, 0.95, 0.90, 0.85, 1.05, 1.00, 1.30, 1.05, 0.70];
// 목표 전투 시간(초, 1배속) : 월드 기본 × 스테이지 번호 계수
const T_WORLD = [60, 68, 74, 80, 85, 90, 95, 100, 105, 110];
const T_STAGE = [0, 0.80, 0.90, 1.00, 1.00, 1.20, 1.00, 1.00, 1.15, 1.05, 1.50];
// 전장 길이(wu) : 기본 + 월드마다 + 스테이지 번호마다. 1 도트 = 2 wu, 한 화면 ≈ 430~540 wu → 두 화면 남짓
const LEN_BASE = +process.env.LEN || 900, LEN_WORLD = 30, LEN_STAGE = [0, 0, 0, 50, 50, 100, 100, 100, 150, 200];
// 적 공격 배율 = 적 체력 배율 × AR. 클수록 양쪽이 빨리 죽고 빨리 채워지는 "정신없는" 싸움이 된다
const AR = +process.env.AR || 2;
// 난이도 여유 : 기준 AI 가 겨우 이기는 적 배율 × 이 값 = 실제 적 배율 (작을수록 쉽다)
const F_STAGE = [0, 0.60, 0.65, 0.70, 0.70, 0.82, 0.72, 0.75, 0.80, 0.80, 0.88];

const r2 = (a, d) => [Math.round(a[0] / d * 10) / 10, Math.round(a[1] / d * 10) / 10];

function buildStage(w, s) {
  const W = WORLDS[w - 1], g = (w - 1) * 10 + s;
  const gim = W.gim[s] || null;
  const type = s === 10 ? 'boss' : gim === 'rush' ? 'rush' : s === 5 ? 'mid' : gim ? 'gimmick' : s === 8 ? 'swarm' : 'normal';
  let dens = DENS[s];
  if (gim === 'gold') dens = 0.8;
  if (gim === 'money') dens = 1.5;
  if (w === 1 && s === 1) dens = 0.65;
  const st = {
    id: w + '-' + s, g, w, s, name: NAMES[w - 1][s - 1], type, gim,
    length: LEN_BASE + LEN_WORLD * (w - 1) + LEN_STAGE[s - 1],
    baseHp: 600, mag: 1, lines: [],
    target: Math.round(T_WORLD[w - 1] * T_STAGE[s]), f: F_STAGE[s] * (w === 1 ? 0.85 : 1) + (w === 10 ? 0.04 : 0),
  };
  if (g === 100) { st.target = 180; st.f = 0.88; }
  const R = W.roles, has = r => W.intro[r] <= s;
  if (type === 'rush') dens = 0.6;
  st.dens = dens;
  st.lines.push({ id: R.F, count: 999, start: 2, every: r2(TRICKLE, dens) });
  const acc = {};
  for (const r in ROLE) acc[r] = W.intro[r] === s ? 1 : 0.5;          // 이번 스테이지에 처음 나오는 적은 첫 물결에 꼭 넣는다
  for (let k = 0; k < WAVE.max; k++) {
    const t0 = WAVE.first + WAVE.period * k, m = dens * (1 + WAVE.grow * k);
    for (const r of ['T', 'H', 'F', 'R', 'Q', 'X']) {
      if (!has(r)) continue;
      acc[r] += ROLE[r].n * m;
      const n = Math.floor(acc[r]); acc[r] -= n;
      if (n > 0) st.lines.push({ id: R[r], count: n, start: Math.round((t0 + ROLE[r].at) * 10) / 10, every: ROLE[r].gap, wave: k });
    }
  }
  const q = has('Q') ? R.Q : R.F, t = has('T') ? R.T : R.F;
  // 사건 : 기지를 처음 때리면 매복, 절반 깎이면 한 번 더
  if (g > 1) st.lines.push({ id: q, count: s >= 6 ? 4 : 3, baseHpBelow: 0.99, every: 0.7 });
  if (g > 2) {
    st.lines.push({ id: t, count: s >= 6 ? 2 : 1, baseHpBelow: 0.5, every: 1.5 });
    st.lines.push({ id: q, count: 3, baseHpBelow: 0.5, delay: 1, every: 0.7 });
  }
  if (type === 'swarm') st.lines.push({ id: R.F, count: 8, baseHpBelow: 0.75, every: 0.5 });

  if (type === 'mid') {                                   // 중간 보스 「대왕 ○○」
    st.lines.push({ id: W.mid, count: 1, baseHpBelow: 0.75, orAfter: 45, mag: 3, boss: true, every: 999 });
    st.lines.push({ id: q, count: 4, baseHpBelow: 0.75, orAfter: 45, delay: 1, every: 0.9 });
  }
  if (type === 'boss') {                                  // 월드 보스
    st.lines.push({ id: W.boss, count: 1, baseHpBelow: 0.99, orAfter: 22, boss: true, every: 999 });
    st.lines.push({ id: q, count: 5, bossHpBelow: 0.5, every: 0.7 });
    st.lines.push({ id: t, count: 2, bossHpBelow: 0.5, delay: 1, every: 2 });
    if (g === 100) {                                      // 최종 보스 : 3단계
      st.lines.push({ id: 'knight', count: 2, bossHpBelow: 0.66, every: 2 });
      st.lines.push({ id: 'dragonling', count: 3, bossHpBelow: 0.33, every: 1.2 });
      st.lines.push({ id: 'golem', count: 1, bossHpBelow: 0.33, delay: 2, every: 999 });
    }
  }
  if (type === 'rush') {                                  // 보스 러시 : 대장 셋이 차례로
    const th = [[0.92, 15], [0.62, 55], [0.32, 95]];
    W.rush.forEach((b, i) => st.lines.push({ id: b[0], count: 1, baseHpBelow: th[i][0], orAfter: th[i][1], mag: b[1], boss: true, every: 999 }));
  }
  if (gim === 'gold') st.lines.push({ id: 'gold', count: 8, start: 10, every: [6, 9] });
  if (gim === 'race') st.enemySpeed = 1.3;
  if (gim === 'cap10') st.capAlly = 10;
  if (gim === 'cap8') st.capAlly = 8;
  if (gim === 'lock') st.walletLock = w >= 6 ? 3 : 2;      // 화로 Lv3(뒤 월드는 Lv4)로 고정
  if (gim === 'wind') st.allySpeed = 0.6;
  if (gim === 'fog') st.fog = true;
  if (gim === 'fogwind') { st.fog = true; st.allySpeed = 0.7; }
  if (gim === 'cost') st.costMax = W.costMax;
  if (gim === 'money') st.startMoney = 1500;
  if (gim === 'fever') st.fever = 30;
  if (gim === 'time') st.limit = Math.ceil(st.target * 1.45 / 5) * 5;
  if (gim === 'eve') for (const id of ['chili', 'snowball', 'can', 'ghost', 'mummy', 'crystal']) st.lines.push({ id, count: 999, start: 20, every: [30, 44] });
  if (w === 10 && s === 8) st.lines.push({ id: 'crystal', count: 999, start: 24, every: [20, 28] });
  return st;
}
function buildStages() { const out = []; for (let w = 1; w <= WORLDS.length; w++) for (let s = 1; s <= 10; s++) out.push(buildStage(w, s)); return out; }

// ── 기준 빌드 : 스토리 드래곤만 · 기대 레벨. (뽑기 드래곤 · 스킬은 플레이어의 "여유분")
const UNLOCK = [['kkomul', 0], ['doldeung', 1], ['bulttong', 2], ['twetwe', 4], ['ssaeng', 7], ['bangul', 11], ['dungsil', 21], ['giljjuk', 26],
                ['eoreum', 31], ['jjirit', 41], ['banjjak', 51], ['kungkwang', 61]];   // [id, 이 스테이지(g)를 깨면 받는다]
const PRIORITY = ['kungkwang', 'giljjuk', 'dungsil', 'twetwe', 'banjjak', 'jjirit', 'eoreum', 'bangul', 'bulttong', 'ssaeng'];
const expLevel = g => Math.floor(1 + 0.21 * (g - 1));                                  // 기대 레벨 : 1-1 = 1 … 10-10 = 21
const slotsAt = w => 5 + Math.max(0, Math.min(5, w - 2));                              // 덱 칸 : 5 → 월드 2~6 클리어마다 +1 → 10
const SKILL_UNLOCK = [['meteor', 6], ['gust', 15], ['frost', 35]];
const LEADER_AT = WORLDS.map(W => W.leader);

function refBonus(w) {                                    // 연구소 = (월드−1) 레벨, 지난 월드 보물 = 2단계
  const lab = w - 1, T = j => (w > j ? 2 : 0);
  return {
    income: (1 + 0.02 * lab) * (1 + 0.04 * T(1)), walletMax: (1 + 0.05 * lab) * (1 + 0.10 * T(5)), startMoney: 20 * lab + 50 * T(10) / 2,
    baseHp: (1 + 0.05 * lab) * (1 + 0.10 * T(4)), breathDmg: (1 + 0.05 * lab) * (1 + 0.10 * T(9)), breathCharge: (1 + 0.02 * lab) * (1 + 0.05 * T(7)),
    cooldown: 1 + 0.03 * T(3), bounty: (1 + 0.03 * lab) * (1 + 0.05 * T(6)), atk: 1 + 0.03 * T(2), hp: 1 + 0.03 * T(8),
  };
}
function refLoad(st, o) {
  o = o || {};
  const W = WORLDS[st.w - 1], g = st.g, lv = Math.max(1, expLevel(g) + (o.dLv || 0));
  const avail = UNLOCK.filter(u => u[1] < g).map(u => u[0]);
  const want = ['kkomul', 'doldeung', ...W.must, ...PRIORITY].filter((id, i, a) => a.indexOf(id) === i && avail.includes(id));
  let deck = want.slice(0, slotsAt(st.w));
  if (st.costMax) {                                        // 비용 제한 스테이지 : 낼 수 있는 용으로 바꿔 든다
    const okc = id => D.units[id].cost <= st.costMax;
    deck = want.filter(okc).slice(0, slotsAt(st.w));
  }
  const skills = o.skills ? SKILL_UNLOCK.filter(u => u[1] < g).map(u => u[0]).slice(-2) : [];
  return { side: 0, deck: deck.map(id => ({ id, lv })), leader: o.leader || LEADER_AT[st.w - 1], leaderLv: lv, bonus: o.noBonus ? {} : refBonus(st.w), skills };
}

module.exports = { AR, WORLDS, NAMES, GIM_KO, buildStage, buildStages, refLoad, refBonus, expLevel, slotsAt, UNLOCK, SKILL_UNLOCK, PRIORITY, LEADER_AT };
