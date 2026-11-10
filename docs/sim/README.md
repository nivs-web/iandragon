# sim — 이안 드래곤 밸런스 계산기

> **이것은 게임이 아니다.** 기획 단계에서 스테이지 100개의 숫자를 정하려고 쓴 계산 도구다. 화면 · 그림 · 소리가 없고, Node 로만 돈다.
> 짝 문서 : [기획서](../IAN_DRAGON_GDD.md) 16장 · [수치표](../IAN_DRAGON_DATA.md) · [제작 명령서](../IAN_DRAGON_DEV_ORDER.md) 1단계

## 무엇을 하나

기준 AI 가 기준 빌드(그 스테이지까지 받은 스토리 용 · 기대 레벨 · 스킬 없음)로 스테이지를 수천 번 자동으로 싸워 보고,

1. 그 빌드가 **겨우 이기는 배율**을 찾아 그 60~88% 를 스테이지 배율로 삼고
2. 걸린 시간을 재서 **기준 시간 · 별 조건**을 정하고
3. 결과를 사람이 보는 표([수치표](../IAN_DRAGON_DATA.md))와 게임이 읽을 스테이지 정의(`stages.generated.json`)로 뽑는다.

## 파일

| 파일 | 내용 | 제작 때 쓰임 |
|---|---|---|
| `data.js` | 용 23 · 좀비 44 · 리더 10 · 스킬 3 · 화로 표 | **수치의 원본.** 변환 스크립트로 게임 `data/` 에 옮긴다 |
| `engine.js` | 전투 규칙 (30틱/초, 결정적) + 기준 AI + 상태 해시 | **전투 코어의 기준 구현.** 옮긴 코어는 이것과 결과가 같아야 한다 |
| `stages.js` | 월드 10개 설계도 → 스테이지 100개 만드는 법, 기준 빌드 | 200스테이지로 늘릴 때 월드 11~20 을 여기에 이어 붙인다 |
| `tune.js` | 스테이지 배율 · 적 기지 체력 자동 조율기 | 밸런스를 다시 잡을 때 |
| `tuned.json` | 조율 결과 (스테이지마다 배율 · 기지 체력 · 승률 · 기준 시간) | `gen-docs.js` 가 읽는다 |
| `gen-docs.js` | 수치표 + `stages.generated.json` 생성. 성장 · 경제 표(`ECON`)도 여기 있다 | 경제 수치의 원본 |
| `stages.generated.json` | **스테이지 100개 정의** (적 줄 · 배율 · 제한 시간 · 별 · 보상 · 해금) | 게임이 그대로 읽는다 |
| `probe.js` | 스테이지 하나를 돌려 5초 단위 전황을 찍어 본다 | 한 스테이지를 들여다볼 때 |
| `golden.js` → `golden.json` | **정답표** 300판 (스테이지 100 × 씨앗 101 · 102 · 103, 편성 · 정책 · 승패 · 틱 · 해시) | 게임 쪽 `npm run data:idg` 가 복사, `npm run qa:idg-core` 가 대조 (2026-11-10 B1 : 300/300) |

## 돌리는 법

Node 18 이상. 설치할 것 없음. 이 폴더에서 :

```bash
node probe.js 3-5
```

```bash
node tune.js 3
```

```bash
node gen-docs.js
```

- `node probe.js <월드-번호> [배율] [적 기지 체력] [화로 목표 Lv] [씨앗] [공격 배율]` — 예 : `node probe.js 5-10 6.5 9000 5 101`
- `node tune.js <월드> [라운드=3]` — 그 월드 10스테이지를 다시 조율해 `tuned-w<월드>.json` 을 쓴다. 월드 하나에 몇 분 걸린다.
- `node gen-docs.js` — 옆에 있는 `tuned-w*.json` 을 `tuned.json` 에 합치고 `../IAN_DRAGON_DATA.md` 와 `stages.generated.json` 을 다시 쓴다.

## 제작에서 이 폴더를 쓰는 두 곳

**1. 전투 코어 검사 (제작 명령서 1단계)**

`stages.generated.json` 의 스테이지 객체는 `engine.js` 의 `simulate` 에 그대로 들어간다.

```js
const { simulate, hashState } = require('./engine');
const D = require('./data');
const { refLoad } = require('./stages');
const stages = require('./stages.generated.json');

const st = stages[0];                                   // 1-1
let hash = 0;
const r = simulate(st, refLoad(st), D, { walletTarget: 3, useSkills: false }, 101,
                   s => { if (s.over) hash = hashState(s); });
// r.win · r.time · hash  → 이것이 "정답"
```

확인해 둔 값 (씨앗 101, 화로 목표 3, 스킬 없음) :

| 스테이지 | 결과 | 시간 | 해시 |
|---|---|---|---|
| 1-1 | 승 | 37.10초 | 528129405 |
| 3-5 | 승 | 59.67초 | 1270999234 |
| 5-10 | 승 | 206.47초 | 1729396255 |
| 10-10 | 승 | 259.67초 | 1410402470 |

스테이지 100 × 씨앗 3 을 이렇게 돌려 정답표(골든 파일)를 만들고, 게임 쪽 코어가 300판 전부 같은 값을 내는지 본다.
(수치표의 "기준 시간"은 화로 목표를 바꿔 가며 잰 것 가운데 가장 좋은 쪽의 10판 평균이라, 위의 한 판 시간과 다르다.)

**2. 밸런스를 고칠 때 (제작 명령서 5장)**

- 스테이지 하나의 배율 · 기지 체력 · 제한 시간만 고친다 → `tuned.json` 의 그 스테이지 값을 고치고 `node gen-docs.js`.
- 용 · 좀비 숫자나 전투 규칙을 고친다 → `data.js` / `engine.js` 수정 → 월드별로 `node tune.js` → `node gen-docs.js` → 골든 파일 다시 뽑기 → 게임 데이터 다시 변환.

## 지킬 것

- `engine.js` 는 `+ − × ÷`, `Math.floor/round/min/max/abs`, 씨앗 난수(mulberry32)만 쓴다. `Math.random` · 시계 · 삼각함수를 넣으면 "같은 입력 → 같은 결과"가 깨져 검사 · 자동 전투 · 멀티가 전부 무너진다.
- 숫자는 이 폴더가 원본이다. 게임 쪽에서 고쳤으면 여기도 같이 고친다.
- 환경 변수 `AR`(공격 배율 ÷ 체력 배율, 기본 2) · `LEN`(전장 기본 길이, 기본 900)은 실험용이다. 평소에는 건드리지 않는다.
