// 이안 드래곤 — 기획 수치 (시뮬레이터 입력 = 게임 본체 balance 의 원본)
// 단위 : 거리 wu(화면 도트 1칸 = 2wu) · 시간 초 · 모든 수치는 Lv1(적은 배율 1.0) 기준
'use strict';

// ── 화로(불씨 생산) Lv1~8 : 초당 불씨 · 최대 보유 · 다음 레벨 값. 판마다 Lv1 에서 다시 시작
const wallet = [
  { income: 30, max: 300, cost: 120 },
  { income: 40, max: 450, cost: 200 },
  { income: 50, max: 650, cost: 300 },
  { income: 62, max: 900, cost: 420 },
  { income: 76, max: 1200, cost: 560 },
  { income: 92, max: 1600, cost: 720 },
  { income: 110, max: 2100, cost: 900 },
  { income: 130, max: 2800, cost: 0 },
];

// ── 아군(아기 드래곤). keep = 자동 전투 AI 가 필드에 유지하는 마릿수(방패 역할만)
// forms[1] = 2단 진화(Lv10) · forms[2] = 3단 진화(Lv20) 에서 덮어쓰는 값
const units = {
  // ── 스토리 드래곤 12 (뽑기 없이 스테이지를 깨면 받는다)
  kkomul:   { name: '꼬물이', rar: 'story', role: '싼 방패', keep: 5, cost: 50, cd: 2.0, hp: 110, atk: 16, range: 40, speed: 100, fore: 0.25, back: 0.45, kb: 3,
              forms: { 1: { name: '씩씩 꼬물이', survive: true }, 2: { name: '꼬물 대장', cd: 1.6, speed: 115 } } },
  doldeung: { name: '돌등이', rar: 'story', role: '튼튼 방패', keep: 4, cost: 100, cd: 4.5, hp: 450, atk: 8, range: 40, speed: 70, fore: 0.30, back: 0.90, kb: 1,
              forms: { 1: { name: '바위등이', tough: ['metal', 'giant'] }, 2: { name: '산등이', tough: ['metal', 'giant', 'red'] } } },
  bulttong: { name: '불똥이', rar: 'story', role: '근접 딜러', cost: 150, cd: 4.0, hp: 220, atk: 52, range: 50, speed: 95, fore: 0.30, back: 0.60, kb: 3, strong: ['ice'],
              forms: { 1: { name: '불꽃이', area: true, splash: 30 }, 2: { name: '활활이', splash: 50, knock: 0.15 } } },
  twetwe:   { name: '퉤퉤', rar: 'story', role: '원거리 범위', cost: 240, cd: 5.5, hp: 150, atk: 38, range: 230, speed: 75, fore: 0.50, back: 0.90, kb: 3, area: true, splash: 40,
              forms: { 1: { name: '퉤퉤퉤', splash: 70 }, 2: { name: '왕퉤퉤', range: 260, knock: 0.15 } } },
  bangul:   { name: '방울이', rar: 'story', role: '밀치기(빨강 특화)', cost: 220, cd: 5.5, hp: 240, atk: 34, range: 140, speed: 80, fore: 0.40, back: 0.80, kb: 3, strong: ['red'], knock: 0.4, knockVs: ['red'],
              forms: { 1: { name: '물방울이', area: true, splash: 40 }, 2: { name: '물대포 방울이', range: 170, slow: { chance: 0.3, time: 1.5 } } } },
  ssaeng:   { name: '쌩쌩이', rar: 'story', role: '돌격', cost: 200, cd: 4.0, hp: 240, atk: 24, range: 45, speed: 210, fore: 0.15, back: 0.25, kb: 5,
              forms: { 1: { name: '번쩍 쌩쌩이', baseKiller: true }, 2: { name: '바람 쌩쌩이', survive: true } } },
  dungsil:  { name: '둥실이', rar: 'story', role: '중거리 범위', cost: 420, cd: 7.0, hp: 140, atk: 95, range: 160, speed: 80, fore: 0.40, back: 0.90, kb: 4, area: true, splash: 60, strong: ['wing'],
              forms: { 1: { name: '뭉게 둥실이', splash: 90 }, 2: { name: '폭풍 둥실이', knock: 0.3, knockVs: ['wing'] } } },
  giljjuk:  { name: '길쭉이', rar: 'story', role: '저격', cost: 600, cd: 9.0, hp: 260, atk: 170, range: 360, speed: 65, fore: 0.90, back: 1.60, kb: 3,
              forms: { 1: { name: '쭉쭉이', massive: ['giant'] }, 2: { name: '왕쭉쭉이', range: 400 } } },
  eoreum:   { name: '얼음땡', rar: 'story', role: '방해(감속)', cost: 300, cd: 7.0, hp: 200, atk: 20, range: 200, speed: 75, fore: 0.45, back: 1.10, kb: 3, area: true, splash: 30, slow: { chance: 1, time: 1.5 },
              forms: { 1: { name: '꽁꽁땡', freeze: { chance: 0.2, time: 1.0 } }, 2: { name: '빙하땡', splash: 60, slow: { chance: 1, time: 2.5 } } } },
  jjirit:   { name: '찌릿이', rar: 'story', role: '연타 · 치명타', cost: 280, cd: 5.0, hp: 180, atk: 14, range: 120, speed: 90, fore: 0.12, back: 0.23, kb: 3, crit: 0.25,
              forms: { 1: { name: '찌리릿', crit: 0.3, breaker: 0.3 }, 2: { name: '번개왕 찌릿', crit: 0.4 } } },
  banjjak:  { name: '반짝이', rar: 'story', role: '정화', cost: 350, cd: 6.0, hp: 260, atk: 60, range: 150, speed: 85, fore: 0.40, back: 0.80, kb: 3, area: true, splash: 30, purify: true, strong: ['ghost'],
              forms: { 1: { name: '반짝반짝이', strong: ['ghost', 'shadow'] }, 2: { name: '눈부신 반짝이', knock: 0.2 } } },
  kungkwang:{ name: '쿵쾅이', rar: 'story', role: '대형', cost: 950, cd: 18, hp: 1200, atk: 190, range: 110, speed: 60, fore: 0.70, back: 1.30, kb: 1, area: true, splash: 40, knock: 0.3,
              forms: { 1: { name: '쿵쾅쾅이', breaker: 1 }, 2: { name: '대지진 쿵쾅', wave: 150 } } },

  // ── 알 뽑기 드래곤 11 (없어도 100스테이지를 깰 수 있다 — 있으면 더 쉽고 다르게 깬다)
  sapjil:   { name: '삽질이', rar: 'rare', role: '기지 파괴', cost: 180, cd: 5.0, hp: 200, atk: 30, range: 40, speed: 110, fore: 0.30, back: 0.60, kb: 3, baseKiller: true,
              forms: { 1: { name: '곡괭이 삽질이', speed: 130 }, 2: { name: '굴착왕 삽질이', survive: true } } },
  pokjuk:   { name: '폭죽이', rar: 'rare', role: '자폭', cost: 160, cd: 6.0, hp: 120, atk: 220, range: 30, speed: 150, fore: 0.20, back: 0.10, kb: 1, blast: 90,
              forms: { 1: { name: '왕폭죽이', blast: 120 }, 2: { name: '불꽃놀이', knock: 0.5 } } },
  sommung:  { name: '솜뭉치', rar: 'rare', role: '방패(날개 특화)', keep: 3, cost: 140, cd: 5.0, hp: 520, atk: 12, range: 40, speed: 75, fore: 0.30, back: 0.80, kb: 2, tough: ['wing'],
              forms: { 1: { name: '구름솜', tough: ['wing', 'shadow'] }, 2: { name: '솜사탕 대장', survive: true } } },
  dongjeon: { name: '동전이', rar: 'rare', role: '불씨 벌이', cost: 120, cd: 4.5, hp: 160, atk: 26, range: 100, speed: 90, fore: 0.30, back: 0.70, kb: 3, bounty2: true,
              forms: { 1: { name: '은전이', range: 130 }, 2: { name: '금전이', area: true, splash: 30 } } },
  gasigong: { name: '가시공', rar: 'super', role: '버티기 · 치명타', cost: 320, cd: 7.0, hp: 520, atk: 40, range: 45, speed: 85, fore: 0.25, back: 0.50, kb: 2, crit: 0.2, survive: true,
              forms: { 1: { name: '밤송이', crit: 0.3 }, 2: { name: '강철 밤송이', strong: ['metal'] } } },
  meari:    { name: '메아리', rar: 'super', role: '파동', cost: 480, cd: 8.0, hp: 220, atk: 85, range: 200, speed: 75, fore: 0.60, back: 1.00, kb: 3, wave: 220,
              forms: { 1: { name: '쩌렁 메아리', breaker: 0.4 }, 2: { name: '천둥 메아리', wave: 320 } } },
  geuneul:  { name: '그늘이', rar: 'super', role: '그림자 사냥', cost: 300, cd: 5.5, hp: 260, atk: 50, range: 45, speed: 170, fore: 0.20, back: 0.40, kb: 4, massive: ['shadow'],
              forms: { 1: { name: '어스름', massive: ['shadow', 'ghost'] }, 2: { name: '한밤이', crit: 0.15 } } },
  nunbora:  { name: '눈보라', rar: 'super', role: '얼리기', cost: 520, cd: 9.0, hp: 240, atk: 45, range: 220, speed: 70, fore: 0.60, back: 1.20, kb: 3, area: true, splash: 60, freeze: { chance: 0.3, time: 1.5 },
              forms: { 1: { name: '눈폭풍', freeze: { chance: 0.4, time: 1.5 } }, 2: { name: '빙하기', splash: 90 } } },
  byeolttong:{name: '별똥별', rar: 'legend', role: '초장거리 폭격', cost: 1100, cd: 20, hp: 600, atk: 320, range: 380, ld: [200, 520], speed: 60, fore: 1.00, back: 2.00, kb: 2, area: true, knock: 0.3,
              forms: { 1: { name: '쌍별똥별', ld: [180, 560] }, 2: { name: '유성우', weaken: { chance: 0.5, time: 3 } } } },
  hwanggeum:{ name: '황금알 대왕', rar: 'legend', role: '안 밀리는 방패', cost: 900, cd: 16, hp: 2400, atk: 90, range: 60, speed: 55, fore: 0.50, back: 1.10, kbImmune: true, area: true, splash: 30, bounty2: true,
              forms: { 1: { name: '황금알 황제', tough: ['red', 'ice'] }, 2: { name: '황금알 신', knock: 0.25 } } },
  ssangdung:{ name: '쌍둥머리', rar: 'legend', role: '연속 범위 · 약화', cost: 850, cd: 14, hp: 800, atk: 110, range: 150, speed: 75, fore: 0.25, back: 0.45, kb: 2, area: true, splash: 40, weaken: { chance: 0.3, time: 3 },
              forms: { 1: { name: '티격태격', weaken: { chance: 0.4, time: 3 } }, 2: { name: '찰떡궁합', crit: 0.1 } } },
};

// ── 적(좀비 군단). bounty = 쓰러뜨리면 받는 불씨. traits = 속성
const enemies = {
  // 1 초록 언덕 (속성 없음)
  walker:  { name: '어슬렁 좀비', w: 1, hp: 90, atk: 12, range: 40, speed: 60, fore: 0.35, back: 0.75, kb: 2, bounty: 18 },
  pup:     { name: '뼈다귀 멍멍이', w: 1, hp: 60, atk: 9, range: 40, speed: 130, fore: 0.20, back: 0.40, kb: 2, bounty: 14 },
  chubby:  { name: '고깔 좀비', w: 1, hp: 420, atk: 30, range: 45, speed: 45, fore: 0.50, back: 1.00, kb: 2, bounty: 60 },
  archer:  { name: '새총 좀비', w: 1, hp: 110, atk: 26, range: 240, speed: 55, fore: 0.60, back: 1.20, kb: 2, bounty: 40 },
  shield:  { name: '헬멧 좀비', w: 1, hp: 900, atk: 22, range: 45, speed: 42, fore: 0.50, back: 1.00, kb: 1, bounty: 110 },
  fart:    { name: '방귀 좀비', w: 1, hp: 200, atk: 12, range: 70, speed: 55, fore: 0.60, back: 1.40, kb: 2, bounty: 45, area: true, splash: 40, knock: 0.6 },
  // 2 부글부글 화산 (빨강)
  skull:   { name: '불타는 해골', w: 2, hp: 160, atk: 34, range: 40, speed: 140, fore: 0.20, back: 0.50, kb: 3, bounty: 45, traits: ['red'] },
  chili:   { name: '빨간 고추 좀비', w: 2, hp: 300, atk: 60, range: 45, speed: 65, fore: 0.40, back: 0.80, kb: 3, bounty: 70, traits: ['red'] },
  lava:    { name: '용암 덩이', w: 2, hp: 700, atk: 80, range: 60, speed: 40, fore: 0.60, back: 1.20, kb: 2, bounty: 120, area: true, splash: 30, traits: ['red'] },
  bomb:    { name: '폭탄 좀비', w: 2, hp: 120, atk: 160, range: 30, speed: 120, fore: 0.30, back: 0.10, kb: 1, bounty: 40, blast: 90, traits: ['red'] },
  // 3 뭉게구름 하늘섬 (날개)
  bat:     { name: '박쥐떼', w: 3, hp: 70, atk: 14, range: 40, speed: 160, fore: 0.15, back: 0.35, kb: 1, bounty: 16, traits: ['wing'] },
  wingz:   { name: '날개 좀비', w: 3, hp: 170, atk: 42, range: 260, speed: 65, fore: 0.60, back: 1.10, kb: 3, bounty: 60, traits: ['wing'] },
  balloon: { name: '풍선 좀비', w: 3, hp: 200, atk: 20, range: 40, speed: 95, fore: 0.30, back: 0.70, kb: 1, bounty: 30, traits: ['wing'], onDeath: { id: 'walker', count: 2 } },
  // 4 꽁꽁 얼음골 (얼음)
  penguin: { name: '미끄럼 펭귄 좀비', w: 4, hp: 130, atk: 22, range: 40, speed: 185, fore: 0.15, back: 0.40, kb: 2, bounty: 35, traits: ['ice'] },
  snowball:{ name: '눈덩이 좀비', w: 4, hp: 380, atk: 26, range: 45, speed: 70, fore: 0.40, back: 0.90, kb: 2, bounty: 55, traits: ['ice'], slow: { chance: 0.5, time: 2 } },
  icicle:  { name: '고드름 사수', w: 4, hp: 150, atk: 36, range: 280, speed: 55, fore: 0.70, back: 1.30, kb: 2, bounty: 70, traits: ['ice'], freeze: { chance: 0.3, time: 1.2 } },
  // 5 덜컹덜컹 고철 광산 (강철 : 치명타가 아니면 1)
  can:     { name: '깡통 좀비', w: 5, hp: 60, atk: 20, range: 40, speed: 55, fore: 0.40, back: 0.80, kb: 1, bounty: 50, metal: true, traits: ['metal'] },
  cart:    { name: '광차 좀비', w: 5, hp: 36, atk: 30, range: 40, speed: 150, fore: 0.20, back: 0.50, kb: 1, bounty: 45, metal: true, traits: ['metal'] },
  gear:    { name: '톱니 기사', w: 5, hp: 150, atk: 45, range: 45, speed: 45, fore: 0.50, back: 1.00, kb: 1, bounty: 120, metal: true, traits: ['metal'] },
  // 6 으스스 유령 묘지 (유령 : 한 번 되살아난다 · 땅굴)
  ghost:   { name: '흐물 유령', w: 6, hp: 180, atk: 28, range: 45, speed: 75, fore: 0.30, back: 0.70, kb: 2, bounty: 30, traits: ['ghost'], revive: { delay: 2.5, hp: 0.6 } },
  bones:   { name: '해골 병사', w: 6, hp: 320, atk: 46, range: 50, speed: 60, fore: 0.40, back: 0.80, kb: 2, bounty: 50, traits: ['ghost'], revive: { delay: 3, hp: 1 } },
  mole:    { name: '땅굴 좀비', w: 6, hp: 240, atk: 40, range: 40, speed: 80, fore: 0.30, back: 0.60, kb: 2, bounty: 60, burrow: 160 },
  // 7 모래바람 사막 (거대 : 안 밀린다 · 약화)
  scarab:  { name: '풍뎅이 떼', w: 7, hp: 80, atk: 16, range: 40, speed: 150, fore: 0.15, back: 0.35, kb: 1, bounty: 15 },
  mummy:   { name: '붕대 미라', w: 7, hp: 500, atk: 40, range: 50, speed: 50, fore: 0.50, back: 1.00, kb: 2, bounty: 80, weaken: { chance: 0.4, time: 3 } },
  golem:   { name: '모래 골렘', w: 7, hp: 1600, atk: 90, range: 60, speed: 34, fore: 0.80, back: 1.40, kbImmune: true, bounty: 200, area: true, splash: 30, traits: ['giant'] },
  // 8 끈적끈적 독 늪 (독 : 최대 체력 비례 · 그림자 : 빠르다)
  shade:   { name: '그림자 좀비', w: 8, hp: 220, atk: 55, range: 40, speed: 200, fore: 0.15, back: 0.35, kb: 3, bounty: 60, traits: ['shadow'] },
  frog:    { name: '개구리 좀비', w: 8, hp: 200, atk: 30, range: 180, speed: 100, fore: 0.40, back: 0.90, kb: 3, bounty: 50, poison: 0.04 },
  shroom:  { name: '독버섯 좀비', w: 8, hp: 260, atk: 10, range: 150, speed: 50, fore: 0.60, back: 1.20, kb: 2, bounty: 70, area: true, splash: 40, poison: 0.06 },
  // 9 반짝반짝 수정 동굴 (수정 : 방어막)
  shard:   { name: '수정 박쥐', w: 9, hp: 90, atk: 24, range: 40, speed: 160, fore: 0.15, back: 0.35, kb: 1, bounty: 30, traits: ['crystal', 'wing'], barrier: 40 },
  crystal: { name: '수정 좀비', w: 9, hp: 400, atk: 44, range: 45, speed: 55, fore: 0.40, back: 0.90, kb: 2, bounty: 90, traits: ['crystal'], barrier: 150 },
  prism:   { name: '프리즘 사수', w: 9, hp: 200, atk: 60, range: 300, speed: 50, fore: 0.70, back: 1.30, kb: 2, bounty: 110, traits: ['crystal'], barrier: 100 },
  // 10 좀비 드래곤 성
  knight:  { name: '좀비 기사', w: 10, hp: 1200, atk: 110, range: 60, speed: 50, fore: 0.50, back: 1.00, kb: 2, bounty: 220 },
  dragonling:{ name: '좀비 새끼용', w: 10, hp: 500, atk: 90, range: 200, speed: 70, fore: 0.60, back: 1.20, kb: 3, bounty: 160, area: true, splash: 40, traits: ['red', 'wing'] },
  // 보너스
  gold:    { name: '황금 좀비', w: 0, hp: 260, atk: 6, range: 40, speed: 95, fore: 0.30, back: 0.90, kb: 4, bounty: 160, gold: true },

  // ── 월드 보스 10
  bossFat:      { name: '거대 좀비', w: 1, boss: true, hp: 2600, atk: 90, range: 90, speed: 36, fore: 0.80, back: 1.40, kb: 4, bounty: 400, area: true, splash: 30 },
  bossVolcano:  { name: '화산 좀비 킹', w: 2, boss: true, hp: 4200, atk: 150, range: 120, speed: 34, fore: 0.90, back: 1.50, kb: 4, bounty: 600, area: true, splash: 50, traits: ['red'] },
  bossRider:    { name: '좀비 라이더', w: 3, boss: true, hp: 3600, atk: 110, range: 300, speed: 50, fore: 0.80, back: 1.40, kb: 5, bounty: 700, area: true, splash: 40, traits: ['wing'] },
  bossAvalanche:{ name: '눈사태 거인', w: 4, boss: true, hp: 6000, atk: 130, range: 140, speed: 30, fore: 1.00, back: 1.60, kb: 3, bounty: 900, area: true, splash: 60, traits: ['ice'], freeze: { chance: 0.4, time: 1.5 } },
  bossRobot:    { name: '고철 대왕 로봇', w: 5, boss: true, hp: 700, atk: 180, range: 110, speed: 30, fore: 1.00, back: 1.60, kb: 2, bounty: 1000, area: true, splash: 40, metal: true, traits: ['metal'] },
  bossGhost:    { name: '유령 대왕', w: 6, boss: true, hp: 5000, atk: 140, range: 200, speed: 36, fore: 0.90, back: 1.50, kb: 4, bounty: 1100, area: true, splash: 50, traits: ['ghost'], revive: { delay: 4, hp: 0.5 } },
  bossPharaoh:  { name: '파라오 좀비', w: 7, boss: true, hp: 7500, atk: 170, range: 160, speed: 28, fore: 1.00, back: 1.60, kbImmune: true, bounty: 1300, area: true, splash: 50, traits: ['giant'], weaken: { chance: 0.5, time: 3 } },
  bossWitch:    { name: '늪의 마녀', w: 8, boss: true, hp: 6500, atk: 110, range: 250, speed: 34, fore: 0.90, back: 1.50, kb: 4, bounty: 1500, area: true, splash: 60, traits: ['shadow'], poison: 0.04 },
  bossCrystal:  { name: '수정 드래곤 좀비', w: 9, boss: true, hp: 8000, atk: 190, range: 180, speed: 30, fore: 1.00, back: 1.60, kb: 3, bounty: 1800, area: true, splash: 60, traits: ['crystal'], barrier: 300 },
  bossLord:     { name: '좀비 드래곤 로드', w: 10, boss: true, hp: 14000, atk: 240, range: 220, speed: 26, fore: 1.10, back: 1.70, kbImmune: true, bounty: 3000, area: true, splash: 70, traits: ['red', 'giant'] },
};
// 굳센 좀비 4종 (초고수 전용 · 난이도 기획 B-4 규칙 3, 2026-11-13) : 원본을 그대로 베끼고 밀치기 면역(kbImmune)만 더한다.
// 이름 · 그림은 원본과 같다(firmOf = 원본 id). 보통 · 쉬움 · 어려움 판에는 나오지 않고 도감에도 따로 오르지 않는다.
for (const id of ['shield', 'lava', 'gear', 'shroom']) enemies[id + 'Firm'] = { ...enemies[id], kbImmune: true, firmOf: id };

// ── 리더(기지 위의 대장 드래곤) : 브레스 + 패시브. charge 초마다 한 번, 내 기지 앞 range 안의 적 전부
// kb = 넉백 배수 · slow/freeze/weaken = 초 · strongVs = 그 속성에 2배 · trueDmg = 강철·방어막 무시 · focus = 체력 제일 많은 적에게 배수
const leaders = {
  novart:    { name: 'NOVART', ko: '노바트', unlock: 0, charge: 20, dmg: 120, range: 650, kb: 1, passive: {} , line: '기본기 만점. 밀치고 태운다' },
  aquantis:  { name: 'AQUANTIS', ko: '아쿠안티스', unlock: 1, charge: 20, dmg: 100, range: 700, kb: 2, slow: 3, strongVs: ['red'], passive: {}, line: '물대포 — 두 배로 밀고 느리게. 빨강에 2배' },
  forestia:  { name: 'FORESTIA', ko: '포레스티아', unlock: 2, charge: 22, dmg: 80, range: 650, freeze: 2.5, strongVs: ['wing'], passive: { hp: 1.1 }, line: '덩굴 — 2.5초 묶는다. 날개에 2배. 아군 체력 +10%' },
  crimsonde: { name: 'CRIMSONDE', ko: '크림존드', unlock: 3, charge: 18, dmg: 240, range: 420, kb: 1, strongVs: ['ice'], passive: { atk: 1.05 }, line: '짧고 굵은 불기둥. 얼음에 2배. 아군 공격 +5%' },
  volttail:  { name: 'VOLTTAIL', ko: '볼트테일', unlock: 4, charge: 22, dmg: 110, range: 650, trueDmg: true, focus: 5, passive: {}, line: '벼락 — 강철·방어막을 뚫고, 제일 센 놈에게 5배' },
  solaris:   { name: 'SOLARIS', ko: '솔라리스', unlock: 5, charge: 22, dmg: 150, range: 650, kb: 1, purify: true, strongVs: ['ghost'], passive: { income: 1.1 }, line: '햇살 — 유령이 다시 못 일어난다. 유령에 2배. 불씨 +10%' },
  sandscale: { name: 'SANDSCALE', ko: '샌드스케일', unlock: 6, charge: 20, dmg: 100, range: 650, weaken: 6, kb: 1, passive: { baseHp: 1.15 }, line: '모래 폭풍 — 6초간 적 공격력 절반. 기지 체력 +15%' },
  shadowfen: { name: 'SHADOWFEN', ko: '섀도우펜', unlock: 7, charge: 20, dmg: 130, range: 650, kb: 1, strongVs: ['shadow'], passive: { cooldown: 1.08 }, line: '그림자 발톱 — 그림자에 2배. 생산 속도 +8%' },
  frostwing: { name: 'FROSTWING', ko: '프로스트윙', unlock: 8, charge: 24, dmg: 60, range: 700, freeze: 4, passive: {}, line: '눈보라 — 4초 동안 전부 꽁꽁' },
  goldrex:   { name: 'GOLDREX', ko: '골드렉스', unlock: 9, charge: 22, dmg: 120, range: 650, kb: 1, bountyMul: 3, passive: { bounty: 1.2 }, line: '황금 브레스 — 브레스로 잡으면 불씨 3배. 처치 불씨 +20%' },
};

// ── 장착 스킬(2칸). 판마다 charges 번, 한 번 쓰면 cd 초 쉰다. first = 시작 후 이만큼 지나야 쓸 수 있다
const skills = {
  meteor: { name: '운석', charges: 2, cd: 20, first: 8, dmg: 300, radius: 250, line: '가장 앞선 적 둘레 250에 큰 피해' },
  gust:   { name: '돌풍', charges: 2, cd: 20, first: 5, kb: 1.5, slow: 4, line: '적 전부를 멀리 밀고 4초간 느리게' },
  frost:  { name: '얼음 숨결', charges: 2, cd: 25, first: 8, freeze: 4, line: '적 전부를 4초간 얼린다' },
};

module.exports = { wallet, units, enemies, leaders, skills, startMoney: 100, playerBaseHp: 1500 };
