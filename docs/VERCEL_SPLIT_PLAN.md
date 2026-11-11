# 오락실 Vercel 분리 계획 (2026-11-11 · 겜부장 · 대표님 «분리하자 · opioo84@gmail.com · 철저히 계획부터»)

## 0. 지금 상태 (읽기만 해서 확인)
- Vercel 계정 하나 : **jachung18@gmail.com (무료 Hobby)** — 프로젝트 10개가 한도(하루 배포 100번 · 저장 · 전송)를 같이 씀
| 프로젝트 | 저장소 | 주소 | 환경변수 | 마지막 |
|---|---|---|---|---|
| **ianworld-shoes** (오락실 본체) | nivs-web/ianworld-shoes | **ianworld.vercel.app** (+ ianworld-shoes.vercel.app → 넘김) | 10 (VITE_FIREBASE_* 7 · VITE_DEBUG · AUTH_GUEST_* 2 = 코드에서 안 씀) | 11/10 |
| iandragon (기획 문서 저장소) | nivs-web/iandragon | iandragon.vercel.app | 0 | 11/11 |
| ianworld (옛 판) | nivs-web/ianworld | ianworld2vercel.app | 0 | 9/17 |
| find-shoes (옛 판) | nivs-web/find_shoes | find-shoes.vercel.app | 0 | 9/17 |
| onstori-pwk2 | nivs-web/onstori | **onstori.com** | 51 | 11/11 |
| onsecret ×3 · mylibrary · croft-coffee | … | … | … | 9~10월 |
- 저장소는 모두 GitHub `nivs-web`(개인 계정 · 공개 저장소).
- 오늘 막힌 까닭 : 오락실 · 문서 저장소에 푸시할 때마다 생긴 미리보기 · 문서 배포가 계정 한도를 다 씀. **iandragon 문서 저장소 푸시도 배포로 세어졌다** → 세 세션 모두 푸시 멈춤(11/11 10시).

## 1. 목표 — «완벽히 분리»가 뜻하는 것
- **Vercel 계정을 둘로** : 오락실은 **opioo84@gmail.com 새 무료 계정**, 온스토리 · 온시크릿 · 서재 · 커피는 지금 계정 그대로.
- 배포 횟수 · 저장 공간 · 전송량 · 요금이 서로 완전히 따로. 한쪽이 바빠도 다른 쪽이 안 막힘.
- 함께 남는 것(분리 대상 아님) : 코드가 있는 GitHub `nivs-web` · 로그인용 Firebase 프로젝트(find-shoes-f5c55). 둘 다 이번 문제(배포 한도)와 무관.
- 주소 **ianworld.vercel.app 그대로** → 아이들 · Firebase 로그인 설정 · 앱(PWA) 아무것도 안 바뀜.

## 2. 방식 고르기 — 결론 : «GitHub Actions + 새 계정 토큰»
| | A. Vercel ↔ GitHub 연결(지금처럼) | **B. GitHub Actions 로 배포(추천)** |
|---|---|---|
| 걸림돌 | GitHub 계정 하나는 Vercel 계정 하나에만 연결된다 → nivs-web 은 이미 jachung18 쪽에 연결. 옮기려면 연결을 끊어야 하는데 **그러면 온스토리 자동 배포가 멈춤**. 아니면 GitHub 계정을 하나 더 만들어야 함 | 없음 — 새 계정의 «배포 토큰» 하나만 GitHub 비밀값에 넣으면 됨 |
| 배포 시점 | 모든 가지 푸시마다(미리보기) | **main 푸시 때만** (한도 걱정 끝) |
| 온스토리 영향 | 있음 | **없음** |
| 비용 | 0 | 0 (공개 저장소라 GitHub Actions 무료) |

## 3. 순서 (각 단계 누가 · 몇 분 · 되돌리기)
| # | 할 일 | 누가 | 시간 | 실패하면 |
|---|---|---|---|---|
| 1 | Aside 에서 opioo84@gmail.com 구글 로그인 → vercel.com 가입(Continue with Google · Hobby) | **대표님** (계정 만들기 · 로그인은 제가 못 함) | 5분 | 아무 영향 없음 |
| 2 | 새 계정 Settings → Tokens → 토큰 만들기(이름 `oraksil-deploy`) → GitHub `nivs-web/ianworld-shoes` → Settings → Secrets and variables → Actions → **VERCEL_TOKEN** 에 붙여넣기 | **대표님** (토큰은 제가 보거나 넣지 않음) | 3분 | 토큰 지우고 다시 |
| 3 | 같은 곳에 Firebase 값 7개를 비밀값으로 (옛 프로젝트 Settings → Environment Variables 에서 복사 : VITE_FIREBASE_API_KEY · AUTH_DOMAIN · PROJECT_ID · STORAGE_BUCKET · MESSAGING_SENDER_ID · APP_ID · DATABASE_URL) | **대표님** | 5분 | 다시 넣기 |
| 4 | `.github/workflows/deploy.yml` 작성 — main 푸시 때만 : 설치 → 비밀값으로 빌드 → 새 계정에 **ianworld-oraksil**(임시 이름) 프로젝트로 운영 배포. vercel.json 의 «작업 가지 배포 끔»도 같이 | 겜부장 | 15분 | 파일 되돌리기 |
| 5 | main 에 올림 → 새 계정에 첫 배포(새 계정은 한도가 새것이라 **오늘 바로 됨**) → 임시 주소에서 첫 화면 · 게임 · 좀비와 드래곤(손님 모드) 확인 | 겜부장 | 10분 | 옛 사이트는 그대로 돌고 있음 |
| 6 | **주소 옮기기** : 옛 프로젝트 Domains 에서 ianworld.vercel.app · ianworld-shoes.vercel.app 빼기 → 바로 새 프로젝트에 ianworld.vercel.app 붙이기 | 대표님 클릭(제가 화면 안내) | 2분 · **사이트 1~2분 빔** | 새 쪽에서 빼고 옛 쪽에 다시 붙이면 원래대로 |
| 7 | 확인 : ianworld.vercel.app 첫 화면 해시 · 구글 로그인 · 멀티 방 만들기 · 명예의 전당 | 겜부장 | 10분 | 6 되돌리기 |
| 8 | 옛 ianworld-shoes 프로젝트 Settings → Git → **연결 끊기**(두 번 배포 막기). 프로젝트는 1주일 남겨 둠(되돌리기용) → 그 뒤 지울지 대표님께 여쭘 | 대표님 클릭 | 1분 | 다시 연결 |
| 9 | iandragon(문서) · ianworld · find-shoes(옛 판) 정리 — 아래 4장 | 대표님 결정 | – | – |

## 4. 대표님이 정하실 것
1. **iandragon(기획 문서) 프로젝트** — 문서 저장소라 사이트가 필요 없음 → **추천 : 옛 계정에서 Git 연결만 끊기**(푸시해도 배포 안 됨). iandragon.vercel.app 을 쓰고 계시면 새 계정으로 같이 옮김.
2. **ianworld · find-shoes(9월 옛 판)** — 추천 : 옮기지 않고 옛 계정에서 Git 연결만 끊어 둠(지우기는 나중에).
3. 주소 옮길 시각(사이트가 1~2분 빔) — 추천 : 아이들이 덜 하는 시간.

## 5. 확인 목록 (끝났다고 말하기 전에)
- [ ] 새 계정 첫 배포 Ready · 임시 주소에서 게임 열림
- [ ] ianworld.vercel.app 이 새 계정 배포를 가리킴(첫 화면 assets/index-*.js 해시 = 새 배포)
- [ ] 구글 로그인 · 저장 · 멀티 방 만들기 · 명예의 전당 읽기
- [ ] 작업 가지에 푸시해도 배포가 안 생김 · main 푸시는 새 계정에만 배포
- [ ] 옛 계정 : onstori.com 그대로 · 오락실 배포 안 생김
