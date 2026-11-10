# 이안 드래곤 게임 — 팀 계획서 (겜부장 · 겜팀장 동시 제작)

> 작성 : 게임 부장 · 2026-11-10 · 대표님 지시 : "제작은 겜부장이 진행하고, 겜팀장과 역할을 나눠 서로 엇갈리지 않게 처음부터 계획을 짜서 함께 만든다"
> 짝 문서 : [기획서](IAN_DRAGON_GDD.md) · [제작 명령서](IAN_DRAGON_DEV_ORDER.md) · [추천안](IAN_DRAGON_RECOMMEND.md)

## 0. 한 장 요약

| | **겜부장** (이 세션 · 진행 책임) | **겜팀장** |
|---|---|---|
| 맡는 것 | **코드 전부** — 뼈대 · 로비 · 가로 전환 · PixiJS 화면 · 전투 코어 · 전투 밖 화면 · 저장 · 오락실 연결 · 합치기 · 배포 | **그림 · 소리 전부** — 팔레트 · 부품 키트 · 캐릭터 · 배경 · 아이콘 · 이펙트 · 효과음 · 곡 · 음성 · 배너 |
| 고치는 폴더 | `src/games/iandragon_game/` 중 `art/` · `audio/` **를 뺀 전부**, `src/screens/` · `src/services/` · `src/config/` · `Portal.js` · `package.json` · `CLAUDE.md` | `src/games/iandragon_game/art/` · `src/games/iandragon_game/audio/` · `public/assets/iandragon_game/` · `tools/idg-art-*.mjs` · `tools/idg-audio-*.mjs` |
| 작업 폴더 (워크트리) | `oraksil/fs-idg` | `oraksil/fs-idg-art` |
| 가지 | `feat/iandragon-game` | `feat/iandragon-game-art` |
| 진행 기록 | `docs/IAN_DRAGON_GAME_PROGRESS.md` | `docs/IAN_DRAGON_GAME_ART_LOG.md` |
| main 배포 | 대표님이 시킬 때만, 겜부장이 | 하지 않는다 |

**철칙 : 상대 폴더의 파일은 한 글자도 고치지 않는다.** 필요하면 메시지로 부탁한다. 그래서 두 가지를 합칠 때 충돌이 생기지 않는다.

---

## 1. 함께 지키는 것

- **Opus 5.5 노력 : 높음.** 엑스트라가 꼭 필요하면 **왜 필요한지 대표님께 말씀드리고 허락을 받은 뒤**에만 쓴다.
- 기획서 · 제작 명령서가 기준. 기획에 없는 것을 넣고 싶으면 먼저 묻는다.
- 그림 : 촘촘한 도트 · 코드로 칸 찍기 · **AI 생성 0** · 제미나이 / 버텍스 · Aseprite MCP 안 씀.
- 전부 오리지널. 다른 영화 · 게임 캐릭터를 닮게 하지 않는다.
- 오락실 파일 쓰기는 편집 도구 또는 Node 만 (파이썬으로 쓰면 줄바꿈이 바뀐 사고가 있었다).
- **토큰 아끼기** : 검사 스크립트는 틀린 줄만 출력 · 큰 출력은 파일로 받고 요약만 보기 · 스크린샷은 축소 · 단계마다 새 세션 + 진행 기록으로 이어받기 · PixiJS 는 `pixijs-skills` 스킬을 보고 쓴다.
- 보고는 한국어, 대표님께.

---

## 2. 둘 사이의 약속 (이것만 맞으면 따로 일해도 된다)

### 2.1 그림 시트 약속

- **결과물** : `public/assets/iandragon_game/atlas.png` + `atlas.json` (PixiJS 스프라이트 시트 JSON 형식). 큰 배경은 `bg_w01.png` … 처럼 따로 둬도 된다 (이름 규칙 같음).
- 구운 결과물(png · json)도 커밋한다 (배포 빌드가 굽지 않아도 되게).
- **프레임 이름** : `종류/id/모습/동작번호`

| 종류 | 예 | 비고 |
|---|---|---|
| `dragon` | `dragon/kkomul/1/walk0` | 모습 1 · 2 (· 3은 2차). id 는 `docs/sim/data.js` 의 용 id |
| `zombie` | `zombie/walker/0/atk1` | id 는 data.js 의 좀비 id. 속성 색 바꾸기는 그림 쪽 사정 — 게임은 id 로만 찾는다 |
| `boss` | `boss/bossFat/0/walk3` | 월드 보스. 걷기 4장 |
| `leader` | `leader/novart/0/idle0` | 내 기지 꼭대기 |
| `base` | `base/nest/0/hp0` · `base/tower/w01/hp2` | 체력 단계 0~3 (75 · 50 · 25% 금) |
| `crown` | `crown/0/0/idle0` | 중간 보스 왕관 (게임이 좀비를 2배로 키워 위에 얹는다) |
| `bg` | `bg/w01/sky` · `far` · `near` · `ground` | 가로로 이어 붙일 수 있게 (타일), 높이 360 이하 |
| `icon` | `icon/attr_red` · `icon/skill_meteor` · `icon/ember` | 24 또는 32칸 |
| `fx` | `fx/hit/0/0~2` · `fx/dust` · `fx/poof` · `fx/ice` · `fx/poison` · `fx/shield` | 공통 이펙트 |

- **동작** : `idle0` · `walk0` `walk1` (보스는 `walk0~3`) · `atk0`(준비) `atk1`(타격) · `kb0`(넉백).
- **기준점** : 발 가운데 (`anchor` x 0.5 · y 1). 크기는 기획서 12.2.
- **필요한 이름 목록** : 겜부장이 데이터 변환 때 `src/games/iandragon_game/data/artManifest.js` 를 만든다 (스테이지에 실제로 나오는 id 기준). 겜팀장의 `npm run qa:idg-art` 가 이 목록과 시트를 대조해 **빠진 프레임만** 출력한다.
- **자리표시 그림** : 겜부장이 `tools/idg-placeholder.mjs` 로 같은 이름 · 같은 크기의 색 네모 시트를 먼저 만들어 쓴다 → 진짜 그림이 오면 파일만 바뀌고 코드는 그대로.

### 2.2 소리 약속

- 겜팀장 모듈 `src/games/iandragon_game/audio/index.js` 가 아래를 내보낸다 :
  `init()` · `play(id)` · `bgm(id, { rate })` · `stopBgm()` · `voice(id)` · `setMuted(on)`
- 효과음 id : `deploy_s` `deploy_m` `deploy_l` · `hit_light` `hit_heavy` `hit_crit` · `knockback` · `die` · `ember` · `wallet_up` · `ready` · `breath_ready` `breath_fire` · `skill_meteor` `skill_gust` `skill_frost` · `roar` · `boss_warn` · `shockwave` · `base_hit` `base_break` · `star` · `levelup` · `evolve` · `hatch_r` `hatch_sr` `hatch_ur` · `fail` · `button`
- 곡 id : `lobby` · `battleA` · `boss` · `win` (불꽃 타임은 `rate` 1.15 로 빠르게)
- 음성 id : `deploy/<용id>/0` · `deploy/<용id>/1` · `boss/<보스id>` · `evolve` · `roar` · `fever` · `win` · `lose` · `star3` · `tut/<번호>`
- 없는 id 는 조용히 무시한다 (오류 내지 않음). 같은 효과음은 0.05초 안에 한 번만.
- 음성 파일 : `public/assets/iandragon_game/voice/<id 의 / 를 _ 로>.ogg` + `.m4a`.

### 2.3 빈 자리 (stub)

- 0단계에서 **겜부장이** `art/README.md` · `audio/index.js`(아무것도 안 하는 같은 모양의 함수들) · 자리표시 시트를 만들어 커밋한다. **그 뒤로 `art/` · `audio/` 는 겜팀장만 고친다.**
- `package.json` 에 겜팀장 스크립트 자리를 미리 만든다 : `assets:idg-art` → `node tools/idg-art-build.mjs`, `qa:idg-art` → `node tools/idg-art-qa.mjs`. 스크립트 파일 내용은 겜팀장이 채운다.

---

## 3. 가지와 합치기

```
origin/main ──► feat/iandragon-game (겜부장)  ── 0단계 커밋 ──┬── … ──◄ merge ── … ──► (대표님 지시 시) main
                                                             └► feat/iandragon-game-art (겜팀장) ── 그림 커밋 …
```

- 겜팀장은 겜부장의 **0단계 커밋 뒤에** 그 커밋에서 자기 가지를 딴다 :
  `git -C oraksil/find_shoes worktree add -b feat/iandragon-game-art ../fs-idg-art feat/iandragon-game`
  (`node_modules` 는 `find_shoes/node_modules` 를 연결해 쓴다 — 새로 설치하지 않는다)
- 두 워크트리는 같은 저장소라 **푸시 없이** 서로의 가지를 본다.
- **합치기는 겜부장이** 한다 : `git merge feat/iandragon-game-art` (합칠 때마다 메시지로 알림).
- 겜팀장은 그림을 게임 화면에서 보고 싶을 때 `git merge feat/iandragon-game` 으로 최신 코드를 받아 온다.
- 원격 푸시 : 겜부장만, main 은 대표님이 시킬 때만.
- `find_shoes` 원래 작업 폴더(가지 `feat/jumprope`, 남의 수정 파일 있음)는 **둘 다 건드리지 않는다.**

---

## 4. 1차 일정 (월드 1~5 · 멀티 제외)

| 순서 | 겜부장 (코드) | 시간 | 겜팀장 (그림 · 소리) | 시간 |
|---|---|---|---|---|
| 1 | **B0 뼈대** — 폴더 · 세로 로비 · 「모험 시작」 → 가로 전환 · PixiJS 설치 · 빈 자리 · 자리표시 시트 · 카드 id 정리 | 1.5~2 | (B0 기다리는 동안) 기획서 12장 · 이 문서 읽기 · 팔레트 초안 | 0.5 |
| 2 | **B1 전투 코어** — engine.js 옮기기 · 데이터 변환 · 골든 300판 | 2~3 | **A1 팔레트 · 부품 키트 · 굽기 스크립트 · 샘플 3장** (꼬물이 · 돌등이 · 어슬렁 좀비) | 1.5~2 |
| ★ | | | **대표님 그림 승인** (샘플 3장) | |
| 3 | **B2 전투 화면** — PixiJS 전장 · 카메라 · HUD · 덱 · 화로 · 브레스 · 키보드 | 2.5~3 | **A2 월드 1 그림 전부** (용 5 × 2모습 · 좀비 · 보스 · 황금 · 왕관 · 기지 · 노바트 · 배경 · 아이콘 · 이펙트) | 2.5~3 |
| 4 | **B3 연출 · 소리 연결** — 타격감 9가지 · 배속 · 일시정지 · 결과 · 합치기 ① | 1~1.5 | **A3 효과음 · 곡 v1** + **음성 대사표 → 보이스 스튜디오 생성** | 2~3 |
| ★ | **확인 지점 ① — 대표님이 월드 1 을 해 본다** | | | |
| 5 | **B4 전투 밖** — 지도 · 스테이지 카드 · 둥지 · 리더 · 스킬 · 연구소 · 보물 · 탭 · 경제 · 저장 · 튜토리얼 · 힌트 | 3~4 | **A4 월드 2~3 그림** | 1.5~2 |
| 6 | **B5 월드 2~5** — 기믹 · 스킬 · 덱 칸 · 레벨 상한 · 3배속 · 자동 전투 50판 확인 | 1~1.5 | **A5 월드 4~5 + 뽑기 용 5종 + 리더** | 1.5~2 |
| 7 | **B6 부화장(5종) · 도감 · 도전 과제 · 매일 첫 승리** | 1~1.5 | **A6 배너** (오락실 도트 배너 가족, 배너 명령서대로) | 1~1.5 |
| 8 | **B7 마감** — 폰 · PC 확인 · 성능 · 합치기 ② · 카드 열기 준비 | 1~1.5 | 마감 확인 (빠진 프레임 0 · 음량) | 0.5 |
| ★ | **확인 지점 ② — 대표님 1차 판정 → 카드 열기 · main 배포 (대표님 지시 시)** | | | |

- **합계** : 겜부장 13~17시간 · 겜팀장 11~14시간 → 작업 합계 24~31시간. **동시에 하므로 달력은 긴 쪽(겜부장) 기준 약 2~3일** (하루 6~8시간).
- 지난 추천안의 "1차 16~22시간"은 한 사람 기준 축소안이었다. 가로 전환 · 로비 · 음성 · 촘촘한 도트 · 둘 사이 합치기를 넣어 다시 셈한 값이 위 표다.
- 2차 (월드 6~10 · 3단 진화 · 뽑기 용 6종 · 엔딩) · 3차 (멀티) 는 1차 판정 뒤에 같은 분담으로.

---

## 5. 서로 알리는 법

- 블록 하나가 끝나면 상대에게 메시지 : **가지 · 커밋 · 바뀐 것 · 상대가 할 일**.
- 막히면 바로 메시지. 상대 폴더를 대신 고치지 않는다.
- 대표님 보고 : 각자 자기 블록을 보고하고, 확인 지점 ① · ② 는 겜부장이 합쳐서 보고한다.
- 대표님 승인이 필요한 것 (main 배포 · Firebase 규칙 · 엑스트라 사용) 은 각자 대신 결정하지 않는다.

---

## 6. 겜팀장에게 줄 시작 명령 (그대로 붙여넣기)

```
너는 「이안 드래곤 게임」의 그림 · 소리 담당(겜팀장)이다. 코드는 겜부장이 맡는다.

먼저 읽어라
1. C:/Users/ariancepc/Desktop/cowork/iandragon/docs/IAN_DRAGON_TEAM_PLAN.md (이 계획서 — 2장 약속이 가장 중요)
2. 같은 폴더 IAN_DRAGON_GDD.md 의 12장(그림) · 13장(소리) · 6장(용) · 7장(좀비 · 보스)
3. IAN_DRAGON_BANNER_ORDER.md (배너는 A6 에서)

일하는 곳 : 겜부장이 0단계를 커밋했다고 알려 오면
  git -C C:/Users/ariancepc/Desktop/cowork/oraksil/find_shoes worktree add -b feat/iandragon-game-art ../fs-idg-art feat/iandragon-game
고치는 곳은 art/ · audio/ · public/assets/iandragon_game/ · tools/idg-art-*.mjs · tools/idg-audio-*.mjs 뿐이다.

지금 할 일 : A1 — 팔레트 · 부품 키트 · 굽기 스크립트 · 샘플 3장(꼬물이 · 돌등이 · 어슬렁 좀비).
샘플은 실제 크기 · 2배 · 나란히 시트로 대표님께 보여 드리고 승인을 받은 뒤 A2 로 간다.

지켜라 : 촘촘한 도트 · AI 생성 0 · 전부 오리지널 · Opus 높음(엑스트라는 대표님 허락 시만) · 상대 폴더 수정 금지 · main 푸시 금지.
```
