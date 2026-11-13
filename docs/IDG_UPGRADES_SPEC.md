# 좀비와 드래곤 — 키우기 · 모으기 숫자와 저장 설계 (핵심 보조 ④ · 2026-11-13)

> 기획 : `IDG_COLLECTION_PLAN.md`(§10 우선) · `IDG_DRAGON_CASTLE_PLAN.md` §5 · §6 · §7 · §11 · `IDG_ART_BRIEF.md` §1 · §4 · `IDG_DIFFICULTY_PLAN.md` §A-4 · §C-5
> 코드 : `oraksil/fs-idg-castle` 가지 `feat/idg-castle`(673bb49 위) — 새 파일 4개만. 전투 코어 반영(수호 불꽃 · 장비 · 꾸미기 효과)은 다음 줄 ⑤.
> 저장 정리 코드(`iandragonGameState.js`)는 보조 D 가 고치는 중이라 **손대지 않았다** → §4 의 조각을 D 이후 합칠 때 넣는다.

---

## 0. 한눈에

| 파일 | 무엇 | 어디서 부르나 |
|---|---|---|
| `src/games/iandragon_game/data/upgrades.js` | 대장 드래곤 사기 `LEAD_SHOP` · 레벨 `LEAD_LV` · 브레스 `BREATH_UP` · 캐슬 `CASTLE_LV` · 장비 `GEAR` · 권장표 `REC_NORMAL` / `REC_HARD` · **`upgradeLoad(save, opt)`** · `recommendNext(save)` | 판 준비(`battleSetup`) · 샵 «드래곤 · 강화 · 캐슬 · 장비» 칸 |
| `src/games/iandragon_game/data/lookFx.js` | 꾸미기 열쇠 → `{ slot, tier, fx }` · 저장 번호 순서 `SLOT_IDS` · **`lookBonus(save, diff)`** · `decodeWear` | 판 준비 (전투 묶음 · 작음 · 이름 없음) |
| `src/games/iandragon_game/data/catalog.js` | 꾸미기 **184개** · 변신 모습 20 · «?» 드래곤 6 · 값 표 `PRICE` · **`visibleLooks` · `itemView` · `mysteryView`** · `lockText` · `giftCandidates` | 샵 · 꾸미기 창 · 도감 · 레벨 선물 (**동적 import · 따로 묶음**) |
| `tools/idg-econ-check.mjs` | 개수 · 얻는 곳 · 돈 맞춤 · «?» 힘의 띠 검사 (틀리면 exit 1) | `node tools/idg-econ-check.mjs` |

- 이름은 «드래곤» · «드래곤캐슬»만. 물건 이름 · id 에 «초고수» · master 없음(검사기가 막음).
- 효과 계산은 **판 시작 때 한 번**. 전투 중에는 부르지 않는다(속도 예산 §6).

## 1. 저장 필드 (`profile.idg`)

### 1.1 D 가 이미 넣은 것 (fs-idg-diff 작업 중 파일 기준 — 그대로 쓴다)

| 필드 | 형식 | 비고 |
|---|---|---|
| `owned` | `'slot:id'` 배열 · **512개** 한도 · 새 칸 `aura · pet · roof · gate · yard` 허용 | 합치기 = 합집합(잘림 없음) |
| `look` | 글자 80자 — 드래곤 쪽 + 깃발 + 테두리 · 칭호 | 머리글 `h n b f r t` + 새 `a`(오라) `p`(펫) |
| `clook` | 글자 80자 — 드래곤캐슬 꾸미기 | 머리글 `o`(지붕) `g`(성문) `y`(앞마당) · 깃발은 옛 저장과 맞게 **`look` 의 `f` 에 그대로** |
| `lvGifts` | `{ "10": "aura:grass", … }` | 값에 새 칸 열쇠 허용(이미 됨) |
| `hardStars` · `hardWon` · `masterStars` | 난이도 묶음 | 첫 클리어 보상은 `hardWon`(새 어려움) 기준 |

### 1.2 새로 더할 것 (§4 조각)

| 필드 | 형식 | 처음 값 | 합치기 |
|---|---|---|---|
| `lead` | `{ own: [id…](16까지), lv: { id: 2~10 }, form: { id: 'red'\|'purple' } }` | §2 옮기기 | own 합집합 · lv 큰 쪽 · form 원격(고른 것) |
| `castle` | `{ lv: 1~10, skin: 1~lv, gear: { cannon\|fence\|repair\|bell: 1~5 }, slots: [id\|null ×3] }` | `{ lv:1, skin:1, gear:{}, slots:[null,null,null] }` | lv · gear 큰 쪽 · skin · slots 원격(고른 것, 정리에서 다시 검사) |
| `breathUp` | `{ pow: 0~8, rng: 0~5, old: 0~8 }` | §2 | 셋 다 큰 쪽 |
| `view` | `'dragon'\|'castle'` | `'dragon'` | 원격 |
| `bossGauge` | `{ hard: { n, at }, master: { n, at } }` — n = 보스 판 다시 깬 누적 · at = 마지막으로 떨어졌을 때의 n | 전부 0 | 둘 다 큰 쪽 |
| `stampN` | 도감 도장을 찍어 준 물건 수(0~512) | 0 | 큰 쪽 |
| `fits` | 코디 3칸 `[{ look, clook } ×3]` (각 80자) | 빈 글자 3칸 | 원격 |
| `units[secret01…myth03]` | 지금 카드 모양 `[레벨, +]` | 없음 | 지금 규칙(큰 쪽) |

**저장하지 않는 것**(진행에서 계산 — 옮길 것 · 어긋날 것 없음)

| 무엇 | 계산 |
|---|---|
| 변신 모습 가짐 | 붉은 = `hardWon` 의 w-10 칸 · 보라 = `masterStars` 의 w-10 칸 → `LEAD_ORDER[w-1]` 의 모습 (`catalog.LEAD_FORMS`) |
| «?» 실루엣 밝기 | 그 드래곤의 `span` 판(예 붉은별 = 어려움 1 ~ 30)에서 깬 판 수 ÷ 판 수, 10조각 (`mysteryView().lit`) |
| 보물 게이지 칸 | `n − at` (어려움 25 · 초고수 60 에서 확정) |
| 도장 «새 물건» | `owned` 의 `stampN` 번째 뒤 (owned 는 얻은 차례로 뒤에 붙는다) · 10개마다 젬 10 = `floor(새 stampN/10) − floor(옛 stampN/10)` 번 |

## 2. 옛 저장 옮기기 (한 번 · 필드가 **없을 때만**)

| 필드 | 규칙 |
|---|---|
| `lead.own` | `novart · aquantis` + 지금 열린 대장 드래곤 전부(`LEADERS[id].unlock ≤ floor(cleared/10)`) — 빼앗지 않음(12장 결정 1). `upgrades.leadOwnFrom(cleared)` 와 같은 값 |
| `lead.lv` | `{}` (모두 Lv1) |
| `castle` | 1단계 · 장비 없음 |
| `breathUp.old` | `min(8, floor(cleared/10))` — 깬 월드 하나마다 사거리 +5% 덤(§5.5). **처음 정할 때만**, 뒤에 월드를 더 깨도 안 늘어남. 새 계정은 cleared 0 이라 0 |
| `look` · `owned` | 그대로(옛 26개는 id · 저장 번호 그대로) |
| `leader` | 그대로. 가진 대장 드래곤이 아니면 판 준비에서 `resolveLeader` 가 추천 → 가진 것 맨 앞으로 |

## 3. 한도 · 합치기 규칙 요약

- 산 물건 512 · 입은 모습 글자 80 · 레벨 선물 기록 18칸 · 대장 드래곤 16 · 코디 3칸.
- 줄지 않는 것(가진 것 · 레벨 · 단계 · 게이지 누적 · 도장 수)은 **큰 쪽 / 합집합**, 고른 것(form · skin · slots · view · fits · look · clook)은 **원격**. 지갑은 지금처럼 큰 쪽.
- 고른 것은 합친 뒤 `normIdg` 가 다시 검사한다 : skin ≤ lv · slots 는 가진 장비만 · 겹침 없이 · 칸 수는 판 준비(`equippedGear`)에서 단계 칸 수까지만.

## 4. D 이후 합칠 때 넣을 코드 조각 (`services/iandragonGameState.js`)

> 부팅 묶음이라 게임 데이터 파일을 import 하지 않는다 → 표를 작게 복사해 둔다.

```js
/* ── 드래곤 · 드래곤캐슬 키우기 (IDG_UPGRADES_SPEC §1.2 · §2) ── */
const LEAD_UNLOCK = { novart: 0, aquantis: 1, forestia: 2, crimsonde: 3, volttail: 4, solaris: 5, sandscale: 6, shadowfen: 7, frostwing: 8, goldrex: 9 };   // LEADERS.unlock 그대로
const GEAR_IDS = ['cannon', 'fence', 'repair', 'bell'];
const obj = (v) => (v && typeof v === 'object' ? v : {});
function lead(raw, cleared) {
  const r = obj(raw), open = Math.floor((cleared || 0) / 10);
  const base = Array.isArray(r.own) ? r.own : Object.keys(LEAD_UNLOCK).filter((id) => LEAD_UNLOCK[id] <= open);   // 옮기기 (결정 1)
  const own = ids(['novart', 'aquantis', ...base], 16);
  const lv = {}, form = {};
  for (const id of own) {
    const n = n0(obj(r.lv)[id], 10); if (n > 1) lv[id] = n;
    const f = obj(r.form)[id]; if (f === 'red' || f === 'purple') form[id] = f;
  }
  return { own, lv, form };
}
function castle(raw) {
  const r = obj(raw), lv = Math.max(1, n0(r.lv, 10)), gear = {};
  for (const k of GEAR_IDS) { const n = n0(obj(r.gear)[k], 5); if (n) gear[k] = n; }
  const sl = Array.isArray(r.slots) ? r.slots : [], slots = [0, 1, 2].map((i) => (GEAR_IDS.includes(sl[i]) && gear[sl[i]] && sl.indexOf(sl[i]) === i ? sl[i] : null));
  return { lv, skin: Math.min(lv, Math.max(1, n0(r.skin, 10))), gear, slots };
}
const breathUp = (raw, cleared) => {
  const r = raw && typeof raw === 'object' ? raw : null;
  return { pow: n0(r?.pow, 8), rng: n0(r?.rng, 5), old: r ? n0(r.old, 8) : Math.min(8, Math.floor((cleared || 0) / 10)) };   // old 는 필드가 없을 때 한 번만
};
const gauge = (raw) => { const r = obj(raw), one = (x) => { const n = n0(obj(x).n, 1e6); return { n, at: Math.min(n, n0(obj(x).at, 1e6)) }; }; return { hard: one(r.hard), master: one(r.master) }; };
const fits = (raw) => [0, 1, 2].map((i) => { const f = obj(Array.isArray(raw) ? raw[i] : null); return { look: lookStr(f.look), clook: lookStr(f.clook) }; });

/* normIdg 반환에 더함 */
    lead: lead(r.lead, r.cleared),
    castle: castle(r.castle),
    breathUp: breathUp(r.breathUp, r.cleared),
    view: r.view === 'castle' ? 'castle' : 'dragon',
    bossGauge: gauge(r.bossGauge),
    stampN: n0(r.stampN, OWNED_MAX),
    fits: fits(r.fits),

/* mergeIdg 반환에 더함 */
    lead: { own: [...new Set([...a.lead.own, ...b.lead.own])].slice(0, 16),
      lv: Object.fromEntries([...new Set([...Object.keys(a.lead.lv), ...Object.keys(b.lead.lv)])].map((k) => [k, Math.max(a.lead.lv[k] || 1, b.lead.lv[k] || 1)])),
      form: remoteRaw.lead ? b.lead.form : a.lead.form },
    castle: { lv: Math.max(a.castle.lv, b.castle.lv),
      gear: Object.fromEntries(GEAR_IDS.filter((k) => a.castle.gear[k] || b.castle.gear[k]).map((k) => [k, Math.max(a.castle.gear[k] || 0, b.castle.gear[k] || 0)])),
      skin: remoteRaw.castle ? b.castle.skin : a.castle.skin, slots: remoteRaw.castle ? b.castle.slots : a.castle.slots },   // 다음 normIdg 가 skin · slots 를 다시 검사
    breathUp: { pow: Math.max(a.breathUp.pow, b.breathUp.pow), rng: Math.max(a.breathUp.rng, b.breathUp.rng), old: Math.max(a.breathUp.old, b.breathUp.old) },
    view: remoteRaw.view ? b.view : a.view,
    bossGauge: { hard: { n: Math.max(a.bossGauge.hard.n, b.bossGauge.hard.n), at: Math.max(a.bossGauge.hard.at, b.bossGauge.hard.at) },
      master: { n: Math.max(a.bossGauge.master.n, b.bossGauge.master.n), at: Math.max(a.bossGauge.master.at, b.bossGauge.master.at) } },
    stampN: Math.max(a.stampN, b.stampN),
    fits: remoteRaw.fits ? b.fits : a.fits,
```

- 주의 : `mergeIdg` 는 끝에서 `normIdg(결과)` 를 한 번 더 거치게 하면(지금 없음) skin · slots 검사가 확실해진다. 안 거치면 판 준비 쪽 `equippedGear` · 꾸미기 창이 이미 다시 거르므로 위험은 없다.
- Firestore 규칙 : `idg` 묶음 하나라 새 필드 이름을 규칙에 따로 적을 필요는 없다(크기만 — 512 열쇠 × 약 20자 ≈ 10KB, 문서 한도 1MB 안).

## 5. 보이는 법 — 함수 하나로 거른다 (`catalog.js`)

| 함수 | 하는 일 |
|---|---|
| `seesMaster(g)` | 보통 10-10 깸(`cleared ≥ 100`) — 이 계정에만 신화 · 보라 모습 · 초고수 «?» 가 **존재**한다 |
| `masterOpen(g)` | 어려움 10-10 깸(붉은 별 100칸 연속) — 이때부터 글에 «초고수» 를 쓴다. 그 전에는 «어려움 10-10 뒤의 도전» |
| `visibleLooks(g)` | 목록 · 개수 · % · 다음 목표 · 레벨 선물 · 특가가 모두 이것으로 거른다 (못 보는 계정 164개 · 보는 계정 184개) |
| `itemView(row, g)` | `'owned' · 'open'(살 수 있음) · 'locked'(자물쇠 + lockText) · 'reward'(전설 «보스에게서») · 'shadow'(신화 «???» 그림자) · 'hidden'` |
| `lockText(row, g)` | 잠긴 카드 한 줄 — «보통 월드 3을 깨면 열려요» · «어려움 3-5를 깨면 열려요» · «어려움 3-10을 처음 깨면 받아요» · «어려움 보스에게서 나와요» · «어려움 10-10 뒤의 도전에서 나와요» |
| `lookCount(g)` | 도감 «모은 수 / 전체» (분모도 `visibleLooks`) |
| `themeDone(g, theme)` | 테마 세트 완성 → 칭호 · 로비 눈요기 색 |
| `mysteryView(g, id)` | «?» 드래곤 : `{ show: 'hidden'\|'card'\|'silhouette'\|'owned', name, text, lit }` — 아래 표 |

| 플레이어 | 어려움 «?»(secret01 ~ 03) | 초고수 «?»(myth01 ~ 03) |
|---|---|---|
| 보통 10-10 전 | secret01 만 «?» 카드(이름 «???» · «아직 아무도 본 적 없는 드래곤») · 02 · 03 은 hidden | 모두 hidden |
| 어려움에 들어감 | 실루엣 + «어려움 3-10에서 깨어나요» + 밝기 | myth01 만 «?» 카드(«어려움 10-10 뒤의 도전에서 깨어나요») · 02 · 03 hidden |
| 초고수에 들어감 | (얻었으면 owned) | 실루엣 + «초고수 4-10에서 깨어나요» + 밝기 |
| 얻음 (`units[id]` 있음) | owned — 봉인된 돌 연출 뒤 이름 공개 | 같음 + 무지개 테 |

- 도감 · 파워업 카드 목록 · 부화장 목록은 «?» 드래곤을 **반드시 `mysteryView` 로만** 그린다(UNITS 를 그대로 늘어놓지 않는다).

## 6. 부화장에서 «?» 드래곤 빼기 (`services/iandragonHatch.js`)

- «?» 드래곤은 ⑤ 에서 `UNITS` 에 `rar: 'secret'` · `'myth'` 로 들어간다. 지금 `POOL` 은 `RATES` 의 열쇠(rare · super · legend)로만 만들어지므로 **코드 그대로 자동으로 빠진다** — 그대로 두면 된다.
- 다른 곳에서 «부화장에서 태어나요» 목록 · 확률 글을 만들 때도 `Object.keys(RATES).includes(u.rar)` 로 거른다(`catalog.NO_HATCH_RAR = ['secret','myth']`). `rar !== 'story'` 로 거르는 곳(예 `battleSetup.makeLoads` 의 `owned`)은 «가진 카드» 판정이라 그대로 맞다.
- 얻는 법 : 어려움 3-10 · 6-10 · 9-10 첫 클리어(`hardWon`) → `units[id] = [21, 0]`(어려움 출전 바닥 Lv21) · 초고수 4-10 · 7-10 · 10-10 첫 클리어 → 같음.
- «+1» : 어려움 보스 판(x-5 · x-10) 다시 깨기에서 **5%**(제안 · 기획 «가끔»)로 가진 어려움 «?» 하나에 +1(최대 +10). 초고수는 «+» 무효라 없음.

## 7. 레벨 선물이 catalog 를 쓰는 법 (`looks.js pickGift` · `iandragonGame.claimGifts`)

- 후보 = `catalog.giftCandidates(g)` → `{ common, fine, rare, hero }` : **샵에 열린 것**(`isOpen`) 중 안 가진 것 · vis 'all' 만. 전설 · 신화 · 변신 모습은 후보에 없다.
- 레벨 선물 전용 칭호 4 → common 에, 전용 테두리 2 → rare 에 더한다(지금처럼).
- 확률 «보통 60 · 고급 28 · 희귀 10 · 영웅 2» (`catalog.GIFT_TIERS` · 옛 글의 «전설 2%» = 영웅). 뽑힌 등급이 비면 **아래로만**(영웅 → 희귀 → 고급 → 보통) → 다 비면 젬 50. **위로 올라가지 않는다**(지금 코드는 위로도 감 — 고칠 것).
- `claimGifts` 는 로비 묶음이라 catalog 를 `await import('../games/iandragon_game/data/catalog.js')` 로 받는다 → `claimGifts` 를 async 로.

```js
/* looks.js — pickGift(g, lv, seed, cand) : cand = giftCandidates(g) + 전용 칭호 · 테두리 */
const order = Array.from({ length: ti + 1 }, (_, k) => ti - k);          // 뽑힌 등급 → 아래로만
for (const i of order) { const left = cand[GIFT_TIERS[i].id].filter((k) => !hasKey(g, k)); if (left.length) return { lv, key: left[Math.floor(pick * left.length)], tier: GIFT_TIERS[i].id, gems: giftGems(lv) }; }
return { lv, key: null, tier: null, gems: giftGems(lv) + GIFT_ALL_GEMS };
```

## 8. 보상 · 떨어짐 (⑤ 에서 battle.js 결과 처리에 넣을 규칙)

| 때 | 받는 것 |
|---|---|
| 보통 w-5 · w-10 깸 | 그 테마 물건이 샵에 열림(저장 없음 · `condMet`) |
| 어려움 w-5 를 **새 어려움으로 처음** 깸(`hardWon` 새로 켜짐) | `from: 'hardFirstX5', w` 전설 1 → `owned` 에 넣음 + 결과 창 «새로 열림» |
| 어려움 w-10 처음 | `hardFirstX10` 전설 1 + 붉은 모습(저장 없음) + (w = 3 · 6 · 9) «?» 드래곤 |
| 초고수 w-10 처음 | `masterFirstX10` 신화 1 + 보라 모습 + (w = 4 · 7 · 10) «?» 드래곤 |
| 어려움 보스 판 다시 깸 | `bossGauge.hard.n += 1` · 3% 또는 `n − at ≥ 25` 이면 `hardReplay` 중 안 가진 것 하나 → `at = n`. 판마다 1번까지 |
| 초고수 보스 판 다시 깸 | `bossGauge.master` · 1% 또는 60 · `masterReplay` |
| 별 합 900 | `stars900` «별의 왕관» |

- 다시 깨기 풀을 다 가졌으면 게이지를 멈추고(글 «다 모았어요») 젬 50.
- 무작위는 결과 화면에서(코어 밖) `계정 id + 'hard' + n` 씨앗(mulberry) — 다시 하기 · 기기 바꿔 뽑기 방지.
- 받을 자격은 진행에서 계산되므로 **고치기 함수** `grantProgress(g)`(로비 진입 때 1번) : `condMet` 이 참인 첫 클리어 보상 열쇠가 owned 에 없으면 넣는다(합치기 · 기기 바꿈 · 놓친 보상 복구 · 멱등).

## 9. 꾸미기 글자 · 저장 번호 합치기 (`looks.js`)

- `lookFx.SLOT_IDS[slot]` 순서 = 저장 번호. 앞 26개는 지금 `LOOKS` 와 같은 순서(브레스는 basic 이 1번). **새 물건은 맨 뒤에만.**
- 합칠 때 `LOOKS` 를 `SLOT_IDS` + `catalog` 이름으로 늘리거나, 전투 · 로비 그리기는 `lookFx.decodeWear(look)` 를 쓴다(이름이 필요 없으면 catalog 를 안 받아도 됨).
- `looks.js` 의 `SLOTS` · `LETTER` 에 `aura:a · pet:p` 추가, `decodeLook` 길이 60 → 80 · 머리글 정규식에 a · p, `parseKey` 정규식에 새 칸. `clook` 은 `o · g · y` 를 같은 방식으로.
- 새 브레스 색 12개의 입자 색 = `lookFx.BREATH_PAL` → `BREATH_COLORS` 에 더한다.
- 화면 글 «성 깃발» → «드래곤캐슬 깃발»(`catalog.SLOT_KO`). «꾸미기는 멋만 내요. 힘은 세지지 않아요» 문구는 지운다(이제 아주 미세하게 세짐).

## 10. 판 준비에서 쓰는 법 (⑤ · `render/battleSetup.js makeLoads`)

```js
import { upgradeLoad, resolveLeader } from '../data/upgrades.js';
const leader = resolveLeader(save, LEADER_AT[stage.w - 1]);              // «자동»도 가진 드래곤 중에서만
const U = upgradeLoad(save, { diff: dk, mode: coop ? 'coop' : 'stage', leader });
const bonus = bonusFor(stage.w, save);
bonus.atk *= U.atk; bonus.hp *= U.hp; bonus.baseHp *= U.baseHp; bonus.breathDmg *= U.breathDmg; bonus.breathCharge *= U.breathCharge;
Object.assign(bonus, { guardDmg: U.guardDmg, baseArmor: U.baseArmor, baseRegen: U.baseRegen, thorns: U.thorns, breathRange: U.breathRange, bossCap: U.bossCap, guardBounty: U.bounty });
load = { ...load, leader, guard: U.guard, gear: U.gear, cannon: U.cannon, bell: U.bell, bonus };
// 대결 · 주간 습격 : upgradeLoad(save, { mode: 'pvp' }) → 모두 1 · 장비 없음 · 사거리 100%(지금 그대로)
```

| 값 | 처음 | 끝까지(어려움) | 끝까지(초고수 — 꾸미기 0) |
|---|---|---|---|
| atk(「드래곤의 기운」) | 1 | 1.45 | 1.45 |
| hp(「캐슬의 가호」) | 1 | 1.36 | 1.36 |
| baseHp(캐슬 단계 × 꾸미기) | 1 | 3.02 | 2.80 |
| guardDmg(수호 불꽃) | 1 | 2.54 | 2.35 |
| breathDmg | 1 | 1.64 | 1.64 |
| breathCharge | 1 | 1.05 | 1 |
| breathRange | 0.60 | 1.00 | 0.97 |
| baseArmor · thorns(울타리 Lv5) | 1 · 0 | 0.82 · 0.6 | 같음 |

- 꾸미기 효과(`lookBonus`) : 모자 · 펫 = 수호 불꽃 / 목 · 오라 = 브레스 충전 / 깃발 · 지붕 · 성문 · 앞마당 = 드래곤캐슬 체력, 등급마다 +0.5 · 1 · 1.5 · 2 · 2.5 · 3%. 같은 효과 합 **+5% 상한**. 가진 것 하나마다 +0.1%(드래곤 쪽 → 수호 불꽃 · 드래곤캐슬 쪽 → 캐슬 체력, **각각 +3% 상한**). 브레스 색 = 사거리 +5% + 특수 1가지(느려짐 · 유령/그림자 + · 브레스 피해 + · 불씨 +). **초고수 · 대결 · 주간은 0.**

## 11. «?» 드래곤 숫자 카드 초안 (⑤ 에서 계산기 `data.js` 로 · 지금 전설 3마리와 같은 힘의 띠)

재주는 **이미 있는 효과만** 섞었다(코어 이름 : `weaken · revive · barrier(방패) · kbImmune · poison · purify · freeze · knock · slow · survive · wave · ld · area/splash · crit`). 새 전투 규칙 없음. 값은 `catalog.MYSTERY[].card`.

| 카드 | 비용 | 쿨 | 체력 | 공격 | 사거리 | 힘 지수 | 재주 | 기획 재주(초안) → 바꾼 까닭 |
|---|---|---|---|---|---|---|---|---|
| (전설) 별똥별 | 1100 | 20 | 600 | 320 | 380 | 58 | 먼 곳 범위 · 밀치기 | 기준 |
| (전설) 황금알 대왕 | 900 | 16 | 2400 | 90 | 60 | 150 | 안 밀림 · 불씨 2배 | 기준 |
| (전설) 쌍둥머리 | 850 | 14 | 800 | 110 | 150 | 148 | 범위 · 약화 | 기준 |
| 붉은별 (secret01 · 어려움 3-10) | 1000 | 18 | 700 | 260 | 360 | 67 | 먼 곳(180 ~ 480) 범위 · 독 2% | «별똥 떨어뜨림» = 먼 곳 범위 + 불꼬리 화상(독) |
| 쇠사슬룡 (secret02 · 6-10) | 900 | 15 | 1800 | 100 | 90 | 133 | 범위 · 밀치기 45% · 느리게 50%/2초 · 안 밀림 | «3초 끌어당김» → 끌어당김이 코어에 없어 **밀치기 + 느리게** |
| 불새룡 (secret03 · 9-10) | 950 | 16 | 700 | 120 | 160 | 140 | 범위 · 정화 · 되살아남(3초 · 50%) | «아군 한 장 되살림» → 남을 살리는 효과가 없어 **자기 되살아남**(유령 좀비의 revive) |
| 별자리룡 (myth01 · 초고수 4-10) | 1000 | 17 | 1000 | 130 | 200 | 121 | 범위 · 약화 40%/3초 · 방패 300 | «충전 +20% 오라» → 오라 효과가 없어 **약화 + 방패** |
| 무지개룡 (myth02 · 7-10) | 1050 | 18 | 750 | 200 | 240 | 79 | 파동 200 · 독 2% | «옆으로 번지는 불» = 파동(뒤까지 관통) + 독 |
| 째깍룡 (myth03 · 10-10) | 1100 | 20 | 1100 | 110 | 220 | 61 | 범위 · 얼림 35%/2초 · 한 번 버티기 | «전부 2초 멈춤» → 판 전체 멈춤이 없어 **범위 얼림 확률** |

- 힘 지수 = 체력(되살아남 · 방패 포함) × 공격 ÷ 공격 주기 ÷ 비용. 전설 띠 58 ~ 150 안(검사기가 막음). 비용 · 쿨 · 체력 · 공격 · 사거리도 전설 셋의 최소 ~ 최대 안.
- 진화(Lv10 · 20 모습) : 붉은별 → 쌍붉은별(사거리 160 ~ 520) → 붉은 유성우(약화) · 쇠사슬룡 → 쇠사슬 대장(밀치기 55%) → 강철 사슬룡(얼림 20%) · 불새룡 → 불사조룡(2.5초 · 60%) → 황금 불새룡(치명 10%) · 별자리룡 → 큰곰자리룡(약화 50%) → 은하수룡(방패 500) · 무지개룡 → 쌍무지개룡(파동 280) → 일곱빛 무지개룡(치명 15%) · 째깍룡 → 모래시계룡(얼림 45%) → 시간의 째깍룡(범위 90).
- ⑤ 에서 어려움 · 초고수 맞춤(⑩) 전에 자동 전투로 «넣어도 승률이 안 흔들리는지» 한 번 본다.

## 12. 돈 맞춤 결과 (`node tools/idg-econ-check.mjs` · 11/13)

### 12.1 값 (꾸미기만 맞춤 · 키우기 값은 기획서 그대로)

| 등급 | 값 | 기준 |
|---|---|---|
| 보통 · 고급 (월드 테마) | 월드 1 : 500 / 1,000 · 2 : 1,000 / 2,000 · 3 : 1,400 / 2,800 · 4 : 1,900 / 3,800 · 5 : 2,400 / 4,800 · 6 : 2,900 / 5,800 · 7 : 3,400 / 6,800 · 8 : 3,800 / 7,600 · 9 : 4,300 / 8,600 · 10 : 4,400 / 8,800 (코인) | 한 월드 묶음 합 = 그 월드 보통 벌이의 29 ~ 34%(★2) · 25 ~ 30%(★3) |
| 희귀 | 젬 60 ~ 80 + 코인 1,000 ~ 4,600 (월드 따라) | 젬 위주 |
| 영웅 | 젬 150 ~ 230 (월드 따라) | 젬만 |
| 옛 26개 | 지금 값 그대로 (왕관 젬 150 · 해골 목걸이 80 · 황금 브레스 200 · 해골 깃발 50) | |
| 처음 오라 «풀잎 오라» | 코인 1,000 | |

### 12.2 구간별 벌이 · 쓸 곳

| 구간 | 벌이 ★2 / ★3 | 쓸 곳 | 결과 |
|---|---|---|---|
| 보통 100판 | 코인 703,875 / 821,188 · 젬 1,700 / 2,200 | 기존 키우기(카드 Lv21 · 용사단 · 연구소) 557,150 + 권장(사거리 5 · 캐슬 3 · Lv3 · 장비 1) 92,000 + 테마 묶음 217,800 | 테마의 **25% / 79%** — 목표 70% 는 ★3 쪽에서 맞음. 기존 키우기를 빼고 보면(기획서 §7 셈) ★2 로도 전부 |
| 어려움 100판 | 코인 703,875(별 코인 덤 없음) · 젬 3,000 / 3,800 | 권장(§8.3) 더 = 코인 1,584,000 · 젬 1,580 + 희귀 · 영웅 | 희귀 · 영웅 **25개 / 32개 = 4.0판 / 3.1판마다 1개** (목표 4 ~ 5판 — 맞음) · 새 희귀 · 영웅 56개의 45% / 57% |
| 초고수 100판 | 코인 938,500 · 젬 4,800 / 5,800 | 남은 희귀 · 영웅 4,185 / 3,510 젬 | 남는 젬 **400 / 2,200**(알 4 ~ 22개) — 대장 드래곤 젬 값(1,670)과 겹치면 거의 0 · 크게 안 남음 |

### 12.3 안 맞는 것 (숫자 근거 · 꾸미기로 못 고침)

- **어려움 코인이 크게 모자란다** : 권장 키우기(§8.3) 누계 코인 1,676,000 인데 보통 끝 남은 돈 0 에서 시작하면 어려움 끝 **−880,125**. 어려움 월드 3 부터 마이너스. 까닭 : 지금 코드(`battle.js` 어려움 · 초고수)는 **별 코인 덤(+25%/별)이 없다** → 기획서 §7 의 «어려움 70만 ~ 123만» 중 위쪽(123만)은 생기지 않는다(70.4만 고정). 다시 깨기(어려움 40% × 1.5 = 월드 10 한 판 약 5,100)로 메우면 약 170판.
  - 고칠 길(겜부장 판단) : ① 어려움 · 초고수에도 별 코인 덤 넣기(+35만) ② §8.3 권장의 장비 «3개 Lv5»(49.5만)를 «2개 Lv5 + 1개 Lv3» 로 ③ 캐슬 8 ~ 10단계 값 낮추기. — 지시대로 키우기 값 · 보상은 건드리지 않았다.
- 보통 ★2 만으로는 테마 25% — 기존 카드 키우기(55.7만)가 벌이의 79% 를 먹기 때문. ★3 · 다시 깨기 · 황금 좀비 · 매일 보상을 합치면 70% 근처.

## 13. 기획과 달라진 것

| # | 기획 | 이렇게 함 | 까닭 |
|---|---|---|---|
| 1 | §1 값 어림 : 보통 2,000 ~ 6,000 · 고급 8,000 ~ 20,000 | 보통 500 ~ 4,400 · 고급 1,000 ~ 8,800 | §10 «그 월드 보통 벌이의 25 ~ 35%»(묶음 합 기준)와 «보통 한 바퀴 70%» 를 맞추면 어림보다 싸진다. 월드 1 벌이가 1.3만이라 묶음 5개가 3,900 |
| 2 | §3.1 처음 열림 «보통 12개쯤» | 옛 26개 전부 + 새 오라 1 = 27개 처음부터 | 지금 처음부터 팔던 것을 숨기지 않음(새 계정만 잃는 셈) · 새 칸(오라)에 처음부터 하나 |
| 3 | §3.1 «어려움 x-10 → 영웅 2» × 10월드 = 20 | 새 영웅 16 + 옛 젬 품목 4(묘지 · 성 테마로 셈) = 20 | 등급 표 «영웅 20» 을 지키려고. 어려움 6-10 · 10-10 은 샵 영웅 대신 전설 · 붉은 모습(· 6-10 «?» 드래곤)만 |
| 4 | §3.1 보통 묶음 «보통 2 · 고급 2» | + 보통 x-5 마다 고급 1 (10개) + 월드 10 고급 1 더 | 고급 40 을 채우려고. 덤으로 보통에서도 «5판마다» 새 것 |
| 5 | §5.4 왕관 +3% (값 기준) | 영웅 = +2% (§3.3 등급 표 하나로) | §3.3 «새 칸도 같은 규칙» 이 최신 — 옛 브레스 4종 특수 효과는 §5.4 의 1/5 그대로 |
| 6 | §3.3 «가진 것 상한 +3%» | 드래곤 쪽 · 드래곤캐슬 쪽 **각각** +3% | 표의 «드래곤 공격 또는 캐슬 체력» 을 둘로 읽음(합쳐 최대 +6%) |
| 7 | §5.5 브레스 색 사거리 +5% | 초고수에서는 0 (꾸미기 효과 없음) → 초고수 최대 97% | «초고수 꾸미기 효과 없음» 규칙을 그대로. 100% 를 원하시면 사거리 덤만 예외로 |
| 8 | §8 «?» 재주 초안 | §11 표 오른쪽 | 이미 있는 효과만(§10) |
| 9 | 변신 모습 · «?» 실루엣 밝기 · 보물 게이지 | 진행에서 계산(저장 필드 최소) | 옮길 것 · 어긋날 것이 줄어든다 |
| 10 | §11.1 `hard: { cleared, stars }` | 쓰지 않음 | 난이도 묶음의 `hardStars · hardWon · masterStars` 로 이미 됨 |

## 14. 겜보조 1 (샵 틀 · 꾸미기 창) · 겜보조 2 (샵 칸)가 바꿔 끼울 때

**겜보조 1 — `catalog.js` (동적 import)**

- 메뉴 : `GROUPS`(드래곤 · 드래곤캐슬 → 작은 칸) · `SLOT_KO` · 한 칸 최대 30개(모자) — 격자 3 / 5칸.
- 카드 : `visibleLooks(g)` 로 거른 뒤 칸별 · `itemView(row, g)` 로 상태, 정렬 «open → locked(조건 순) → owned». 잠긴 글 = `lockText(row, g)`. 등급 = `TIER_COLOR[row.tier]` 테 + `row.star`(★1 ~ 6) 크게 · `TIER_KO` 작게.
- 값 : `row.price = { coin, gem }` — **희귀는 둘 다 > 0**(코인 + 젬 단추 둘 · 둘 다 있어야 삼 · 둘 다 뺌). `null` = 판매 안 함. 특가 후보 = `dealCandidates(g)`(열린 것 중 안 가진 것) · 할인은 지금 `dealPrice` 를 코인 · 젬 각각에.
- 사기 : `owned` 에 `row.key`('aura:grass') 붙이기(512 한도). 입기 : `look` 의 `h n b a p f` · `clook` 의 `o g y`, 번호 = `lookFx.SLOT_IDS[slot].indexOf(id) + 1`. 브레스 basic = 1번 · 늘 가짐.
- 도감 : `lookCount(g)` «37 / 184»(못 보는 계정 164) · `themeDone`. 도장 = `stampN`.
- 아이콘 : 그림은 하위 메뉴마다 96px webp 시트 1장(겜팀장) — 나오기 전엔 지금처럼 글자.

**겜보조 2 — `upgrades.js`**

- 드래곤 : `LEAD_START` · `LEAD_SHOP[{ id, world, coin, gem }]`(코인 **또는** 젬) · `LEAD_SHOP_LATER`(id null = 그리지 않음) · `ownedLeads(save)` · 살 수 있음 = `cleared ≥ world × 10`. 저장 `lead.own` 에 id 추가.
- 레벨 : `leadLvOf(save, id)` · `leadLvCost(lv)`(Lv lv → lv+1, 9까지) · 효과 글 `LEAD_LV.guard`(+15%) · `.aura`(+5%) · `.rangeAt`(Lv4 · 7 · 10 사거리 +4%). 저장 `lead.lv[id]`.
- 강화 : `BREATH_UP.pow`(8) · `.rng`(5) · `breathUpCost('pow'|'rng', k)` · 지금 사거리 = `breathRangeOf(save, leaderId, lookBonus(save).breathRange)`. 저장 `breathUp.pow · rng`.
- 캐슬 : `CASTLE_LV[lv-1]`(name · world · coin · gem · hp · slots) · 차례대로만 · `cleared ≥ world × 10`. 저장 `castle.lv`(모습 `castle.skin` 은 꾸미기 창).
- 장비 : `GEAR_IDS` · `GEAR[id]`(name · 레벨 표) · `gearCost(k)`(k = 1 구매) · 끼우기 `castle.slots`(칸 수 = `castleOf(lv).slots`) · 실제 끼운 것 = `equippedGear(save)`.
- 샵 맨 위 «추천 강화» : `recommendNext(save, leaderId)` → `{ kind, to, id?, cost }` 또는 null.
- 합계 글 : `TOTALS`(캐슬 745,000 · 850 / 장비 1개 165,000 · 180 / 드래곤 Lv10 199,000 · 150 / 브레스 237,000 · 110 / 드래곤 8마리 478,000 · 1,670).
