// 이안 드래곤 — 전투 코어 기준 구현(레퍼런스) + 헤드리스 시뮬레이터
// ─────────────────────────────────────────────────────────────────────────────
// · 기획서 「5. 전투 규칙」과 1:1 로 맞춘 "정답 코드"다. 게임 본체의 전투 코어는 이 파일을 그대로 옮겨 쓴다.
// · DOM · 캔버스 · 시계를 쓰지 않는다 → Node 에서 그대로 돌고(밸런스 시험), 브라우저에서도 그대로 돈다.
// · 결정론 : + − × ÷ 와 Math.floor/round/min/max/abs, 시드 난수(mulberry32)만 쓴다.
//   (sin/cos/pow/sqrt/Math.random/Date 금지 — 기기마다 답이 달라질 수 있다. 멀티 lockstep 의 전제.)
// · 단위 : 거리 wu(월드 유닛, 화면 도트 1칸 = 2wu), 시간 초. 한 틱 = 1/30초 고정.
// · 진영 : side 0 = 왼쪽(기지 x=0, 오른쪽으로 전진) · side 1 = 오른쪽(기지 x=L, 왼쪽으로 전진)
'use strict';

const TICK = 1 / 30;
const K = {
  KB_DIST: 90, KB_TIME: 0.35,       // 넉백 : 0.35초 동안 90wu 밀려난다(그동안 무적 · 조준 불가). 보스는 절반
  CAP_UNITS: 25, CAP_STAGE: 40,     // 진영당 필드 유닛 상한(플레이어) · 스테이지 적 상한
  SLOW_MUL: 0.4,                    // 감속 : 이동 속도 ×0.4
  WEAK_MUL: 0.5,                    // 약화 : 공격력 ×0.5
  BEHIND: 30,                       // 이만큼 지나친 적까지는 때릴 수 있다
  SPAWN_X: 10,                      // 기지 앞 10wu 에서 나온다
  DANGER: 450,                      // (AI 용) 적이 내 기지 450wu 안 = 위험
  FEVER1: 1.5, FEVER2: 2, FEVER_GAP: 30,   // 불꽃 타임 : 양쪽 공격력 ×1.5 → 30초 뒤 ×2
  RAGE_MAX: 100, RAGE_DEATH: 3, RAGE_BASE: 1,   // 분노 : 아군 1마리 쓰러질 때 +3, 기지 체력 1% 잃을 때 +1
  RAGE_TIME: 8, RAGE_ATK: 1.5, RAGE_SPEED: 1.3, // 포효 : 적 전체 넉백 + 8초간 아군 공격 ×1.5 · 이동 ×1.3
  BURROW_SEE: 220, BURROW_TIME: 1.2,            // 땅굴 : 아군이 220wu 안에 보이면 1.2초 숨었다가 전선 뒤로
  SHOCK_MUL: 2,                     // 보스 등장 충격파 : 넉백 시간 2배(=180wu)
  PVP_BOUNTY: 0.2,                  // 대전 : 상대 유닛 처치 시 그 유닛 비용의 20%
};

function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// 레벨 배율 : Lv1~10 +20%/레벨, Lv11~20 +10%/레벨, Lv21~30 +5%/레벨
function levelMul(lv) {
  if (lv <= 10) return 1 + 0.2 * (lv - 1);
  if (lv <= 20) return 2.8 + 0.1 * (lv - 10);
  return 3.8 + 0.05 * (lv - 20);
}
// 진화 : 2단(Lv10~) ×1.2, 3단(Lv20~) ×1.5 — 능력은 def.forms[1], def.forms[2] 가 덮어쓴다
function formOf(lv) { return lv >= 20 ? 2 : lv >= 10 ? 1 : 0; }
function formMul(lv) { return [1, 1.2, 1.5][formOf(lv)]; }
function powerMul(lv) { return levelMul(lv) * formMul(lv); }
function resolveDef(def, lv) {
  const f = formOf(lv);
  if (!def.forms || f === 0) return def;
  let out = { ...def };
  for (let i = 1; i <= f; i++) if (def.forms[i]) out = { ...out, ...def.forms[i] };
  return out;
}
function hasTrait(list, tr) {
  if (!tr || !list) return false;
  if (Array.isArray(tr)) { for (const t of tr) if (list.includes(t)) return true; return false; }
  return list.includes(tr);
}

const ZERO_BONUS = { income: 1, walletMax: 1, startMoney: 0, baseHp: 1, breathDmg: 1, breathCharge: 1, cooldown: 1, bounty: 1, atk: 1, hp: 1 };

/* stage  = { length, baseHp, mag(적 체력 배율), atkMag(적 공격 배율, 없으면 mag), lines:[{id,count,start,every,baseHpBelow,orAfter,bossHpBelow,delay,mag,boss}],
              bossShock, fever, capAlly, walletLock, costMax, startMoney, allySpeed, enemySpeed, limit, pvp }
   loads  = [{ side, deck:[{id,lv}], bonus, leader, leaderLv, skills:[id] }]   // PvE 1인 = 1개, 협동 = side 0 둘, 대전 = side 0 / side 1
   D      = { units, enemies, wallet, leaders, skills, startMoney, playerBaseHp }  */
function createBattle(stage, loads, D, seed) {
  const S = {
    t: 0, L: stage.length, stage, D, rnd: mulberry32(seed || 1), uid: 0, units: [],
    base: [{ hp: 0, maxHp: 0 }, { hp: 0, maxHp: 0 }], players: [], lines: [], over: null, boss: null,
    feverAt: stage.fever || 120,
    st: { enemySpawned: 0, kills: 0, bossAt: null, firstHit: null, minFront: stage.length, swings: 0, _dir: 0, _ext: 0, _sampleT: 0 },
  };
  const perSide = [0, 0];
  for (const ld of loads) perSide[ld.side]++;
  for (const ld of loads) {
    const B = Object.assign({}, ZERO_BONUS, ld.bonus || {});
    const leader = D.leaders[ld.leader || 'novart'];
    if (leader.passive) for (const k in leader.passive) { if (k === 'startMoney') B[k] += leader.passive[k]; else B[k] *= leader.passive[k]; }   // 리더 패시브
    const lmul = powerMul(ld.leaderLv || 1);
    const wl0 = stage.walletLock != null ? stage.walletLock : 0;
    S.players.push({
      side: ld.side, B, leader, lmul, wl: wl0,
      deck: ld.deck.map(d => ({ id: d.id, lv: d.lv, def: resolveDef(D.units[d.id], d.lv), mul: powerMul(d.lv) })),
      cd: ld.deck.map(() => 0),
      money: D.startMoney + B.startMoney + (stage.startMoney || 0),
      breathT: 0, breathCharge: leader.charge / B.breathCharge,
      skills: (ld.skills || []).map(id => ({ id, def: D.skills[id], left: D.skills[id].charges, cdT: D.skills[id].first || 0 })),
      rage: 0, rageT: 0,
      cap: Math.floor((stage.capAlly || K.CAP_UNITS) / perSide[ld.side]) + (perSide[ld.side] > 1 ? 1 : 0),
      st: { spawned: 0, lost: 0, breath: 0, walletUps: 0, skill: 0, rageUse: 0, earned: 0, spent: 0, peak: 0 },
    });
    // 기지 체력 : 리더 레벨을 따른다. 같은 편이 둘이면 더 높은 쪽 ×1.5
    const hp = Math.round(D.playerBaseHp * lmul * B.baseHp);
    const b = S.base[ld.side];
    b.maxHp = b.maxHp === 0 ? hp : Math.round(Math.max(b.maxHp, hp) * 1.5);
    b.hp = b.maxHp;
  }
  if (perSide[1] === 0) { S.base[1].hp = S.base[1].maxHp = stage.baseHp; }
  S.lines = (stage.lines || []).map(e => ({ ...e, left: e.count, next: e.start || 0, armed: e.baseHpBelow == null && e.bossHpBelow == null }));
  return S;
}

function makeUnit(S, def, side, mul, owner, amul) {
  const hp = Math.max(1, Math.round(def.hp * mul));
  if (amul == null) amul = mul;                                     // 공격 배율을 따로 주지 않으면 체력 배율과 같다
  return {
    id: ++S.uid, def, side, owner, mul, amul, hp, maxHp: hp, atk: Math.round(def.atk * amul),
    x: side === 0 ? K.SPAWN_X : S.L - K.SPAWN_X,
    state: 'walk', t: 0, slowT: 0, freezeT: 0, weakT: 0, boss: !!def.boss,
    barrier: def.barrier ? Math.round(def.barrier * mul) : 0,
    revived: false, survived: false, burrowed: false, burrowT: 0, corpseT: 0,
    alive: true, killer: null, killOwner: -1, selfKill: false,
  };
}
const targetable = u => u.alive && u.corpseT <= 0 && u.burrowT <= 0 && u.state !== 'kb';
function knock(u, mult) { if (u.def.kbImmune) return; u.state = 'kb'; u.t = K.KB_TIME * (mult || 1); }
function countSide(S, side, owner) { let n = 0; for (const u of S.units) if (u.alive && u.side === side && (owner == null || u.owner === owner)) n++; return n; }

// 피해 한 번. src = 때린 유닛(없으면 브레스 · 스킬), o = { trueDmg, purify, pi(가해 플레이어) }
function applyHit(S, src, tgt, raw, o) {
  if (!targetable(tgt)) return;
  const sd = src ? src.def : null, td = tgt.def;
  let d = raw;
  if (sd) {
    if (hasTrait(td.traits, sd.strong)) d *= 1.5;
    if (hasTrait(td.traits, sd.massive)) d *= 3;
    if (td.strong && hasTrait(sd.traits, td.strong)) d *= 0.5;
    if (td.tough && hasTrait(sd.traits, td.tough)) d *= 0.25;
  }
  let crit = !!(o && o.trueDmg);
  if (sd && sd.crit && S.rnd() < sd.crit) { crit = true; d *= 2; }
  if (td.metal && !crit) d = 1;                                    // 강철 : 치명타가 아니면 1
  if (tgt.barrier > 0) {                                           // 방어막 : 한 방이 방어막 이상이어야 깨진다(그 한 방은 흡수)
    const breaker = sd && sd.breaker && S.rnd() < sd.breaker;
    if (d >= tgt.barrier || breaker || (o && o.trueDmg)) tgt.barrier = 0;
    return;
  }
  if (sd && sd.poison && !tgt.boss && !td.poisonImmune) d += tgt.maxHp * sd.poison;   // 독 : 최대 체력 비례 추가 피해
  const before = tgt.hp;
  tgt.hp -= d;
  if (tgt.hp <= 0 && td.survive && !tgt.survived) { tgt.survived = true; tgt.hp = 1; }
  if (tgt.hp <= 0) {
    tgt.alive = false; tgt.killer = sd; tgt.killOwner = src ? src.owner : (o && o.pi != null ? o.pi : -1);
    tgt.killPurify = !!((sd && sd.purify) || (o && o.purify)); tgt.killBounty = (sd && sd.bounty2) ? 2 : (o && o.bountyMul) || 1;
    return;
  }
  if (!td.kbImmune) {
    const step = tgt.maxHp / (td.kb || 1);                          // 넉백 : 최대 체력의 1/kb 를 잃을 때마다
    const crossed = Math.floor((tgt.maxHp - tgt.hp) / step) - Math.floor((tgt.maxHp - before) / step);
    if (crossed > 0) knock(tgt, 1);
    else if (sd && sd.knock && !tgt.boss && (!sd.knockVs || hasTrait(td.traits, sd.knockVs)) && S.rnd() < sd.knock) knock(tgt, 1);
  }
  const half = tgt.boss ? 0.5 : 1;                                  // 보스는 상태 이상 시간 절반
  if (sd && sd.slow && !td.slowImmune && S.rnd() < sd.slow.chance) tgt.slowT = Math.max(tgt.slowT, sd.slow.time * half);
  if (sd && sd.freeze && !td.freezeImmune && S.rnd() < sd.freeze.chance) tgt.freezeT = Math.max(tgt.freezeT, sd.freeze.time * half);
  if (sd && sd.weaken && !td.weakImmune && S.rnd() < sd.weaken.chance) tgt.weakT = Math.max(tgt.weakT, sd.weaken.time * half);
}

const distFromBase = (S, side, u) => side === 0 ? u.x : S.L - u.x;      // side 기지에서 u 까지

// 플레이어 명령. cmd = { p, type:'spawn'|'wallet'|'breath'|'skill'|'rage', i }
function applyCommand(S, cmd) {
  const p = S.players[cmd.p]; if (!p) return false;
  const D = S.D, foe = 1 - p.side;
  if (cmd.type === 'spawn') {
    const d = p.deck[cmd.i]; if (!d || p.cd[cmd.i] > 0 || p.money < d.def.cost) return false;
    if (S.stage.costMax && d.def.cost > S.stage.costMax) return false;   // 기믹 : 비용 제한
    if (countSide(S, p.side, cmd.p) >= p.cap) return false;
    p.money -= d.def.cost; p.st.spent += d.def.cost; p.cd[cmd.i] = d.def.cd / p.B.cooldown;
    const u = makeUnit(S, d.def, p.side, d.mul, cmd.p);
    u.hp = u.maxHp = Math.round(u.maxHp * p.B.hp); u.atk = Math.round(u.atk * p.B.atk);
    S.units.push(u); p.st.spawned++;
    return true;
  }
  if (cmd.type === 'wallet') {
    if (S.stage.walletLock != null) return false;
    const w = D.wallet[p.wl]; if (p.wl >= D.wallet.length - 1 || p.money < w.cost) return false;
    p.money -= w.cost; p.st.spent += w.cost; p.wl++; p.st.walletUps++;
    return true;
  }
  if (cmd.type === 'breath') {                                       // 리더 브레스 : 내 기지 앞 range 안의 적 전부
    if (p.breathT < p.breathCharge) return false;
    const ld = p.leader, dmg = ld.dmg * p.lmul * p.B.breathDmg;
    let top = null;
    for (const u of S.units) if (targetable(u) && u.side === foe && distFromBase(S, p.side, u) <= ld.range && (!top || u.hp > top.hp)) top = u;
    for (const u of S.units) {
      if (!targetable(u) || u.side !== foe || distFromBase(S, p.side, u) > ld.range) continue;
      let d = dmg;
      if (ld.focus && u === top) d *= ld.focus;
      if (ld.strongVs && hasTrait(u.def.traits, ld.strongVs)) d *= 2;
      const half = u.boss ? 0.5 : 1;
      applyHit(S, null, u, d, { trueDmg: ld.trueDmg, purify: ld.purify, pi: cmd.p, bountyMul: ld.bountyMul });
      if (!u.alive) continue;
      if (ld.kb) knock(u, ld.kb);
      if (ld.slow) u.slowT = Math.max(u.slowT, ld.slow * half);
      if (ld.freeze) u.freezeT = Math.max(u.freezeT, ld.freeze * half);
      if (ld.weaken) u.weakT = Math.max(u.weakT, ld.weaken * half);
    }
    p.breathT = 0; p.st.breath++;
    return true;
  }
  if (cmd.type === 'skill') {                                        // 장착 스킬 : 판마다 횟수 제한
    const s = p.skills[cmd.i]; if (!s || s.left <= 0 || s.cdT > 0) return false;
    const sk = s.def;
    let front = null;                                                // 내 기지에 가장 가까운 적
    for (const u of S.units) if (targetable(u) && u.side === foe && (!front || distFromBase(S, p.side, u) < distFromBase(S, p.side, front))) front = u;
    for (const u of S.units) {
      if (!targetable(u) || u.side !== foe) continue;
      if (sk.radius && front && Math.abs(u.x - front.x) > sk.radius) continue;
      const half = u.boss ? 0.5 : 1;
      if (sk.dmg) applyHit(S, null, u, sk.dmg * p.lmul, { pi: cmd.p });
      if (!u.alive) continue;
      if (sk.kb) knock(u, sk.kb);
      if (sk.freeze) u.freezeT = Math.max(u.freezeT, sk.freeze * half);
      if (sk.slow) u.slowT = Math.max(u.slowT, sk.slow * half);
    }
    s.left--; s.cdT = sk.cd; p.st.skill++;
    return true;
  }
  if (cmd.type === 'rage') {                                         // 분노 포효
    if (p.rage < K.RAGE_MAX) return false;
    for (const u of S.units) if (targetable(u) && u.side === foe) knock(u, 1);
    p.rage = 0; p.rageT = K.RAGE_TIME; p.st.rageUse++;
    return true;
  }
  return false;
}

function step(S, cmds) {
  if (S.over) return;
  const D = S.D, L = S.L, stage = S.stage, units = S.units;
  S.t += TICK;
  const time = S.t;
  const fever = time >= S.feverAt + K.FEVER_GAP ? K.FEVER2 : time >= S.feverAt ? K.FEVER1 : 1;

  // ── 1. 자원 · 충전
  for (const p of S.players) {
    const w = D.wallet[p.wl];
    p.money = Math.min(w.max * p.B.walletMax, p.money + w.income * p.B.income * TICK);
    for (let i = 0; i < p.cd.length; i++) if (p.cd[i] > 0) p.cd[i] -= TICK;
    if (p.breathT < p.breathCharge) p.breathT += TICK;
    for (const s of p.skills) if (s.cdT > 0) s.cdT -= TICK;
    if (p.rageT > 0) p.rageT -= TICK;
  }

  // ── 2. 스테이지 적 등장
  for (const ln of S.lines) {
    if (!ln.armed) {
      if (ln.baseHpBelow != null && (S.base[1].hp <= S.base[1].maxHp * ln.baseHpBelow || (ln.orAfter != null && time >= ln.orAfter))) { ln.armed = true; ln.next = time + (ln.delay || 0); }
      else if (ln.bossHpBelow != null && S.boss && (!S.boss.alive || S.boss.hp <= S.boss.maxHp * ln.bossHpBelow)) { ln.armed = true; ln.next = time + (ln.delay || 0); }
    }
    if (ln.armed && ln.left > 0 && time >= ln.next && countSide(S, 1) < K.CAP_STAGE) {
      const u = makeUnit(S, D.enemies[ln.id], 1, (ln.mag || 1) * (stage.mag || 1), -1, (ln.mag || 1) * (stage.atkMag || stage.mag || 1));
      units.push(u); ln.left--; S.st.enemySpawned++;
      ln.next = time + (Array.isArray(ln.every) ? ln.every[0] + S.rnd() * (ln.every[1] - ln.every[0]) : (ln.every || 999));
      if (ln.boss) {
        u.boss = true; S.boss = u; S.st.bossAt = time;
        if (stage.bossShock !== false) for (const a of units) if (targetable(a) && a.side === 0) knock(a, K.SHOCK_MUL);   // 등장 충격파
      }
    }
  }

  // ── 3. 플레이어 명령
  if (cmds) for (const c of cmds) applyCommand(S, c);

  // ── 4. 유닛 갱신 (타격은 모았다가 5에서 한꺼번에)
  const A = [], E = [];                                              // 조준 가능한 유닛 : A = side0 (x 큰 순), E = side1 (x 작은 순)
  for (const u of units) if (targetable(u)) (u.side === 0 ? A : E).push(u);
  A.sort((a, b) => b.x - a.x || a.id - b.id); E.sort((a, b) => a.x - b.x || a.id - b.id);
  const front0 = A.length ? A[0].x : 0;
  const hits = [];
  const rageSide = [false, false];
  for (const p of S.players) if (p.rageT > 0) rageSide[p.side] = true;
  for (const u of units) {
    if (!u.alive) continue;
    if (u.corpseT > 0) {                                             // 유령 : 쓰러졌다가 되살아난다
      u.corpseT -= TICK;
      if (u.corpseT <= 0) { u.hp = Math.max(1, Math.round(u.maxHp * u.def.revive.hp)); u.state = 'walk'; }
      continue;
    }
    if (u.burrowT > 0) {                                             // 땅굴 : 상대 전선 뒤로 솟아오른다
      u.burrowT -= TICK;
      if (u.burrowT <= 0) u.x = Math.max(60, Math.min(u.x, front0 - u.def.burrow));
      continue;
    }
    if (u.freezeT > 0) { u.freezeT -= TICK; continue; }
    const slow = u.slowT > 0; if (slow) u.slowT -= TICK;
    const weak = u.weakT > 0; if (weak) u.weakT -= TICK;
    const dir = u.side === 0 ? 1 : -1;
    if (u.state === 'kb') {
      u.x -= dir * (K.KB_DIST / K.KB_TIME) * TICK * (u.boss ? 0.5 : 1);
      u.x = Math.max(K.SPAWN_X, Math.min(L - K.SPAWN_X, u.x));
      u.t -= TICK; if (u.t <= 0) u.state = 'walk';
      continue;
    }
    let nd = 1e9, found = false;                                     // 가장 가까운 적까지의 거리
    if (u.side === 0) { for (const f of E) if (f.x >= u.x - K.BEHIND) { nd = Math.max(0, f.x - u.x); found = true; break; } }
    else { for (const f of A) if (f.x <= u.x + K.BEHIND) { nd = Math.max(0, u.x - f.x); found = true; break; } }
    const bd = u.side === 0 ? L - u.x : u.x;                         // 상대 기지 앞면까지
    const def = u.def;
    if (def.burrow && !u.burrowed && u.side === 1 && found && nd <= K.BURROW_SEE) { u.burrowed = true; u.burrowT = K.BURROW_TIME; continue; }
    if (u.state === 'walk') {
      if ((found && nd <= def.range) || bd <= def.range) { u.state = 'fore'; u.t = def.fore; }
      else {
        const sm = (u.side === 0 ? (stage.allySpeed || 1) : (stage.enemySpeed || 1)) * (slow ? K.SLOW_MUL : 1) * (rageSide[u.side] ? K.RAGE_SPEED : 1);
        u.x += dir * def.speed * sm * TICK;
      }
    } else if (u.state === 'fore') {                                 // 선딜 → 타격 → 후딜
      u.t -= TICK;
      if (u.t <= 0) { hits.push({ u, weak }); u.state = 'back'; u.t = def.back; }
    } else if (u.state === 'back') {
      u.t -= TICK; if (u.t <= 0) u.state = 'walk';
    }
  }

  // ── 5. 타격 적용
  for (const h of hits) {
    const u = h.u, def = u.def;
    if (!u.alive) continue;
    const dmg = u.atk * fever * (h.weak ? K.WEAK_MUL : 1) * (rageSide[u.side] ? K.RAGE_ATK : 1);
    const lo = def.ld ? def.ld[0] : -K.BEHIND;
    const hi = def.ld ? def.ld[1] : def.range + (def.area ? (def.splash || 0) : 0);
    const bd = u.side === 0 ? L - u.x : u.x;
    const list = [];
    for (const f of units) {
      if (f.side === u.side || !targetable(f)) continue;
      const ahead = u.side === 0 ? f.x - u.x : u.x - f.x;
      if (def.blast) { if (Math.abs(ahead) <= def.blast) list.push([ahead, f]); }
      else if (ahead >= lo && ahead <= hi) list.push([ahead, f]);
      else if (def.wave && ahead > hi && ahead <= hi + def.wave) list.push([ahead + 1e6, f]);
    }
    list.sort((a, b) => a[0] - b[0] || a[1].id - b[1].id);
    let hitBase = false;
    if (def.area || def.blast) {
      for (const [, f] of list) applyHit(S, u, f, dmg);
      hitBase = bd <= hi;
    } else if (list.length && list[0][0] < 1e6) {
      applyHit(S, u, list[0][1], dmg);
      for (const [a, f] of list) if (a >= 1e6) applyHit(S, u, f, dmg);       // 파동 : 사거리 밖 wave 까지 뒤따라 맞는다
    } else hitBase = bd <= def.range;
    if (hitBase) {
      const b = S.base[1 - u.side], d = dmg * (def.baseKiller ? 4 : 1);
      const before = b.hp;
      b.hp -= d;
      if (u.side === 0 && S.st.firstHit == null) S.st.firstHit = time;
      for (const p of S.players) if (p.side === 1 - u.side) {                // 기지가 맞으면 분노가 찬다
        p.rage = Math.min(K.RAGE_MAX, p.rage + K.RAGE_BASE * 100 * (before - Math.max(0, b.hp)) / b.maxHp);
      }
    }
    if (def.blast) { u.alive = false; u.killer = null; u.selfKill = true; }
  }

  // ── 6. 죽음 처리
  for (let i = units.length - 1; i >= 0; i--) {
    const u = units[i];
    if (u.alive) continue;
    if (u.def.revive && !u.revived && !u.killPurify && !u.selfKill) {          // 유령 부활(정화로 쓰러지면 안 일어난다)
      u.revived = true; u.alive = true; u.hp = 1; u.corpseT = u.def.revive.delay; u.killer = null; u.state = 'walk';
      continue;
    }
    const foes = S.players.filter(p => p.side !== u.side);
    if (u.owner < 0) {                                                         // 스테이지 적 → 처치 불씨(같은 편이 나눠 갖는다)
      S.st.kills++;
      for (const p of foes) {
        const gain = (u.def.bounty || 0) * p.B.bounty * (u.killBounty || 1) / foes.length;
        p.money = Math.min(D.wallet[p.wl].max * p.B.walletMax, p.money + gain); p.st.earned += gain;
      }
      if (u.def.onDeath) for (let n = 0; n < (u.def.onDeath.count || 1); n++) {
        const c = makeUnit(S, D.enemies[u.def.onDeath.id], 1, u.mul, -1, u.amul); c.x = Math.min(L - K.SPAWN_X, u.x + n * 14); units.push(c);
      }
    } else {
      const me = S.players[u.owner];
      if (!u.selfKill) { me.st.lost++; me.rage = Math.min(K.RAGE_MAX, me.rage + K.RAGE_DEATH); }
      for (const p of foes) {                                                  // 대전 : 상대 유닛을 잡으면 비용의 20%
        const gain = u.def.cost * K.PVP_BOUNTY;
        p.money = Math.min(D.wallet[p.wl].max * p.B.walletMax, p.money + gain); p.st.earned += gain;
      }
    }
    units.splice(i, 1);
  }

  // ── 통계(전선 흔들림)
  for (let pi = 0; pi < S.players.length; pi++) { const n = countSide(S, S.players[pi].side, pi); if (n > S.players[pi].st.peak) S.players[pi].st.peak = n; }
  let ef = L; for (const u of units) if (u.alive && u.side === 1 && u.x < ef) ef = u.x;
  if (ef < S.st.minFront) S.st.minFront = ef;
  if (time >= S.st._sampleT) {
    S.st._sampleT = time + 1;
    if (S.st._dir === 0) { S.st._ext = ef; S.st._dir = 1; }
    else if (S.st._dir === 1) { if (ef > S.st._ext) S.st._ext = ef; else if (ef < S.st._ext - 150) { S.st._dir = -1; S.st._ext = ef; S.st.swings++; } }
    else { if (ef < S.st._ext) S.st._ext = ef; else if (ef > S.st._ext + 150) { S.st._dir = 1; S.st._ext = ef; S.st.swings++; } }
  }

  // ── 7. 승패
  if (S.base[1].hp <= 0 && S.base[0].hp <= 0) S.over = { winner: -1 };
  else if (S.base[1].hp <= 0) S.over = { winner: 0 };
  else if (S.base[0].hp <= 0) S.over = { winner: 1 };
  else if (time >= (stage.limit || 300)) {
    const a = S.base[0].hp / S.base[0].maxHp, b = S.base[1].hp / S.base[1].maxHp;
    S.over = { winner: stage.pvp ? (a > b ? 0 : a < b ? 1 : -1) : 1, timeout: true };
  }
}

/* ── 시험용 플레이어(AI). 사람 대신 단추를 누른다. 게임 본체에서는 "자동 전투"와 대전 봇으로 그대로 쓸 수 있다.
   pol = { walletTarget, react, sloppy, breathMin, useSkills, useRage }  */
function aiCommands(S, pi, pol, mem) {
  const p = S.players[pi], D = S.D, foe = 1 - p.side, out = [];
  mem.t = (mem.t || 0) - TICK;
  if (mem.t > 0) return out;
  mem.t = pol.react || 0.5;
  let near = 1e9, bossIn = false, nFoe = 0, foeFront = null;
  for (const u of S.units) {
    if (!targetable(u) || u.side !== foe) continue;
    const d = distFromBase(S, p.side, u);
    nFoe++; if (d < near) { near = d; foeFront = u; }
    if (u.boss) bossIn = true;
  }
  const danger = near < K.DANGER, calm = near > S.L * 0.6;
  const w = D.wallet[p.wl], maxMoney = w.max * p.B.walletMax;
  const wantWallet = S.stage.walletLock == null && p.wl < Math.min(pol.walletTarget == null ? 2 : pol.walletTarget, D.wallet.length - 1);
  let acted = false;
  if (wantWallet && !danger && p.money >= w.cost) { out.push({ p: pi, type: 'wallet' }); acted = true; }
  const saving = wantWallet && calm && S.t < 25;                       // 초반 : 적이 멀면 화로부터
  if (!acted && !saving && countSide(S, p.side, pi) < p.cap) {
    const ok = i => p.cd[i] <= 0 && p.money >= p.deck[i].def.cost && !(S.stage.costMax && p.deck[i].def.cost > S.stage.costMax);
    let pick = -1;
    if (pol.sloppy) {                                                  // 서툰 플레이 : 되는 대로 누른다
      const c = []; for (let i = 0; i < p.deck.length; i++) if (ok(i)) c.push(i);
      if (c.length) pick = c[Math.floor(S.rnd() * c.length)];
    } else {
      // 1) 방패 유지 : keep 마리까지. 방패에 쓰는 돈은 전체의 45% 까지(위험하면 제한 없음)
      if (danger || (mem.shield || 0) <= 0.45 * ((mem.total || 0) + 300)) {
        let best = -1;
        for (let i = 0; i < p.deck.length; i++) {
          const def = p.deck[i].def; if (!def.keep || !ok(i)) continue;
          let n = 0; for (const u of S.units) if (u.alive && u.side === p.side && u.owner === pi && u.def === def) n++;
          if (n < def.keep && (best < 0 || def.cost < p.deck[best].def.cost)) best = i;
        }
        pick = best;
      }
      // 2) 딜러 : 싼 것부터 차례로 "다음에 뽑을 것"을 정해 놓고 돈을 모은다
      if (pick < 0) {
        const dps = [];
        for (let i = 0; i < p.deck.length; i++) { const def = p.deck[i].def; if (!def.keep && def.cost <= maxMoney && !(S.stage.costMax && def.cost > S.stage.costMax)) dps.push(i); }
        dps.sort((a, b) => p.deck[a].def.cost - p.deck[b].def.cost || a - b);
        mem.wi = mem.wi || 0;
        for (let k = 0; k < dps.length; k++) {
          const i = dps[(mem.wi + k) % dps.length];
          if (p.cd[i] > 1.5) continue;                                 // 쿨타임이 한참 남았으면 다음 것
          if (ok(i)) { pick = i; mem.wi = (mem.wi + k + 1) % dps.length; }
          break;
        }
        if (pick < 0 && (danger || dps.length === 0 || p.money >= maxMoney * 0.9)) {   // 위험 · 딜러 없음 · 돈이 넘친다 : 지금 되는 것 중 제일 비싼 것
          for (let i = 0; i < p.deck.length; i++) if (ok(i) && (pick < 0 || p.deck[i].def.cost > p.deck[pick].def.cost)) pick = i;
        }
      }
    }
    if (pick >= 0) {
      out.push({ p: pi, type: 'spawn', i: pick });
      const c = p.deck[pick].def.cost; mem.total = (mem.total || 0) + c; if (p.deck[pick].def.keep) mem.shield = (mem.shield || 0) + c;
    }
  }
  if (p.breathT >= p.breathCharge) {
    let n = 0, b = false;
    for (const u of S.units) if (targetable(u) && u.side === foe && distFromBase(S, p.side, u) <= p.leader.range) { n++; if (u.boss) b = true; }
    if (n >= (pol.breathMin || 3) || b) out.push({ p: pi, type: 'breath' });
  }
  if (pol.useSkills) {
    for (let i = 0; i < p.skills.length; i++) {
      const s = p.skills[i]; if (s.left <= 0 || s.cdT > 0) continue;
      const sk = s.def;
      let n = 0;
      if (foeFront) for (const u of S.units) if (targetable(u) && u.side === foe && (!sk.radius || Math.abs(u.x - foeFront.x) <= sk.radius)) n++;
      const push = near < S.L * 0.4;
      if ((sk.dmg && (n >= 5 || (bossIn && n >= 2))) || (!sk.dmg && (push || (bossIn && near < S.L * 0.55)) && n >= 3)) { out.push({ p: pi, type: 'skill', i }); break; }
    }
  }
  if (pol.useRage !== false && p.rage >= K.RAGE_MAX && nFoe >= 3 && (near < S.L * 0.6 || bossIn)) out.push({ p: pi, type: 'rage' });
  return out;
}

/* 한 판 돌리기. policies[i] 가 없으면 그 플레이어는 가만히 있는다.
   돌려주는 값 : { win, time, baseLeft, enemyBaseLeft, timeout, ...통계 }  (win = side 0 승리) */
function simulate(stage, loads, D, policies, seed, onTick) {
  if (!Array.isArray(loads)) loads = [Object.assign({ side: 0 }, loads)];
  if (!Array.isArray(policies)) policies = [policies];
  const S = createBattle(stage, loads, D, seed);
  const mem = loads.map(() => ({}));
  while (!S.over) {
    const cmds = [];
    for (let i = 0; i < loads.length; i++) if (policies[i]) for (const c of aiCommands(S, i, policies[i], mem[i])) cmds.push(c);
    step(S, cmds);
    if (onTick) onTick(S);
  }
  const p0 = S.players[0].st;
  return {
    win: S.over.winner === 0, timeout: !!S.over.timeout, time: S.t,
    baseLeft: Math.max(0, S.base[0].hp) / S.base[0].maxHp, enemyBaseLeft: Math.max(0, S.base[1].hp) / S.base[1].maxHp,
    wl: S.players[0].wl, spawned: p0.spawned, lost: p0.lost, peak: p0.peak, breath: p0.breath, skill: p0.skill, rage: p0.rageUse,
    walletUps: p0.walletUps, earned: p0.earned, spent: p0.spent,
    enemySpawned: S.st.enemySpawned, kills: S.st.kills, bossAt: S.st.bossAt, firstHit: S.st.firstHit,
    minFront: S.st.minFront / S.L, swings: S.st.swings, players: S.players.map(p => p.st),
  };
}

// 상태 해시(멀티 동기 확인용) : 두 기기가 같은 틱에 같은 값을 내야 한다
function hashState(S) {
  let h = 2166136261 >>> 0;
  const mix = v => { h ^= (Math.round(v * 16) | 0); h = Math.imul(h, 16777619) >>> 0; };
  mix(S.base[0].hp); mix(S.base[1].hp);
  for (const p of S.players) { mix(p.money); mix(p.wl); mix(p.rage); }
  for (const u of S.units) { mix(u.id); mix(u.x); mix(u.hp); }
  return h;
}

module.exports = { TICK, K, mulberry32, levelMul, formOf, formMul, powerMul, resolveDef, createBattle, step, applyCommand, aiCommands, simulate, hashState, targetable };
