# 겜부장 진행 파일 (재부팅 대비 · 2026-11-13)

## 하던 일

난이도 4단계(어려움 · 초고수) · 계정 레벨 999 · 명예의 전당 1 ~ 10위 한 화면 — 대표님이 «기획 끝나면 개발 · 배포까지 하고 보고서»로 미리 허락하신 묶음.

| 단계 | 상태 |
|---|---|
| 기획서 `docs/IDG_DIFFICULTY_PLAN.md` | 끝 · iandragon main `479ea41` 에 올림 |
| 어려움 · 초고수 200판 숫자 맞춤 | 끝 · 결과는 `iandragon-diff/_fit_backup/master/out/` (`idgDifficulty.json` · `stages.hard.json` · `stages.master.json` · `summary-all.md`) |
| 깨끗한 작업 폴더 | `cowork/iandragon-diff`(가지 `idg-difficulty`) · `cowork/oraksil/fs-idg-diff`(가지 `feat/idg-difficulty` · `node_modules` 는 `..\fs-idg\node_modules` 로 이어 둠) |
| 개발 | **시작 전** — 고친 코드 없음 |

## 꼭 기억할 것

- 200판 숫자는 **허락 전인 새 브레스(뜸 12틱) + 얼음 4.5초**가 든 계산기(iandragon main 의 고친 `docs/sim`)로 맞췄다. 배포된 게임(뜸 없음 · 얼음 4.0초) 기준으로 **200판 다시 확인 · 어긋난 판 다시 맞춤**이 먼저다. `iandragon-diff/docs/sim` 이 깨끗한 계산기.
- 이번 배포에는 난이도 묶음만 나간다 : `git push origin feat/idg-difficulty:main` (fs-idg-diff 에서). `fs-idg` 의 브레스 · 단추 · 캐슬 수정은 커밋하지 않은 채 파일로만 있다(대표님 판정 대기 · 배포 금지).
- 어려움 10-8 한 판은 합격선 밖(`fail` 표시) — 보고서에 적는다.
- 명예의 전당에는 초고수 값을 보내지 않는다. 보통 10-10 을 못 깬 계정에는 «초고수» 글자가 어디에도 안 나온다.
- 칭호 · 테두리는 이미 있는 틀(`data/looks.js` 의 `LOOKS.frame` · `TITLES`)에 덧붙인다.

## 다음 한 걸음

보조 3명(Opus 높음)을 동시에 띄운다. 파일이 겹치지 않게 :

1. **S — 판 자료** : `iandragon-diff/docs/sim` 에 `_fit_backup/master/lib.js` 의 `variant()` 를 옮겨 `buildHard / buildMaster` · 단단한 좀비(`*Firm`) · `stages.hard.generated.json` · `stages.master.generated.json` · golden 추가 → 깨끗한 엔진으로 200판 다시 확인 → `fs-idg-diff/tools/idg-import-data.mjs` 가 `data/stages/hard.js` · `master.js`(따로 불러오는 묶음)를 만들게.
2. **D — 난이도 구조** : `render/battleSetup.js` · `render/battle.js` · `services/iandragonGameState.js` · `services/iandragonGame.js` · `screens/IanDragonGameLobby.js` · 로비 CSS (기획서 §A · §C · §F-3).
3. **H — 명예의 전당** : `screens/idgHall.js` · `services/idgRank.js` · 전당 CSS · `docs/FIREBASE_RULES.md` (기획서 §D).

그 뒤 : 내가 직접 전부 눌러 점검(§F-6 · 390×844 · 360×640 · 844×390) → `npm run qa:idg-core` · `npm run build` → 한 번 배포 → `npm run assets:warm` → 겜팀장에게 알림 → 대표님께 보고서.

## 재부팅 뒤 다시 할 명령

```bash
cd /c/Users/ariancepc/Desktop/cowork/oraksil/fs-idg-diff && git status --short | head && ls node_modules | wc -l
cd /c/Users/ariancepc/Desktop/cowork/iandragon-diff && git status --short | head && ls _fit_backup/master/out | wc -l
```

- `node_modules` 가 비어 보이면 : `cmd /c mklink /J node_modules ..\fs-idg\node_modules` (fs-idg-diff 에서).
- 미리보기 서버는 내 포트로만 새로 띄운다(다른 세션 포트 5320 · 5330 · 5354 는 건드리지 않는다).
