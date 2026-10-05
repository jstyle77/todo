# TODO — ai-chat 실행 계획

> 기준일: 2026-10-05 · 설계와 규칙은 [CLAUDE.md](./CLAUDE.md)를 따릅니다.
>
> **현재 상태**: MVP 코드(인증, 스트리밍 채팅 API, 대화 CRUD, 사이드바, 마크다운 렌더링)는 대부분 작성되어 있고
> `npm run typecheck` / `npm run lint` / `npm test`(13개)는 통과합니다.
> 다만 `.env.local`이 없어 **실제 서비스(MongoDB, OAuth, Claude API)와 연결해 실행해 본 적이 없고**,
> `ai-chat/` 디렉터리 전체가 아직 git에 커밋되지 않았습니다.

---

## 0. 프로젝트 기반 — 완료

- [x] Next.js 16 (App Router) + TypeScript strict 프로젝트 생성
- [x] Tailwind CSS v4 + shadcn/ui(`base-nova`) 설정, `button` / `input` / `textarea` 추가
- [x] 의존성 설치: `@anthropic-ai/sdk`, `next-auth` v5, `@auth/mongodb-adapter`, `mongodb`, `zod`, `react-markdown`, `remark-gfm`, `rehype-highlight`
- [x] Vitest / Playwright 설정, npm 스크립트(`dev`, `build`, `lint`, `typecheck`, `test`, `test:e2e`)
- [x] `.env.example`, `.gitignore`, `README.md`, `CLAUDE.md` 작성

## 1. 버전 관리 — 먼저 할 일

- [x] `ai-chat/` 현재 상태를 첫 커밋으로 남기기 (`.env*`, `.next/`, `test-results/`가 제외되는지 `git status`로 확인)
- [ ] 상위 디렉터리의 `.serena/`, `serena/`를 커밋할지 `.gitignore`에 넣을지 결정
- [ ] 이후 작업은 기능 단위 브랜치 → 커밋

## 2. 외부 서비스 준비 & 로컬 실행

- [ ] **MongoDB**: Atlas 클러스터(또는 로컬 MongoDB) 생성, DB 이름이 포함된 `MONGODB_URI` 확보
- [ ] **Claude API**: Claude Console에서 `ANTHROPIC_API_KEY` 발급, 사용량 한도 설정
- [ ] **Google OAuth**: 클라이언트 생성, 콜백 `http://localhost:3000/api/auth/callback/google` 등록
- [ ] **GitHub OAuth**: OAuth App 생성, 콜백 `http://localhost:3000/api/auth/callback/github` 등록
- [ ] `npx auth secret`으로 `AUTH_SECRET` 생성
- [ ] `.env.example` → `.env.local` 복사 후 값 채우기
- [ ] `npm run dev`로 서버가 뜨고 `/login` 페이지가 보이는지 확인

## 3. 백엔드 — 구현 완료, 실제 연동 확인 필요

- [x] `lib/env.ts` — zod 환경 변수 검증 (처음 사용할 때 검증)
- [x] `lib/db.ts` — MongoClient 전역 싱글턴 + 인덱스 생성
- [x] `lib/auth.ts` — Auth.js(Google, GitHub) + MongoDB 어댑터, `getUserId()`
- [x] `lib/anthropic.ts` — 클라이언트 싱글턴, `CHAT_MODEL`, `SYSTEM_PROMPT`
- [x] `lib/repositories/` — conversations / messages (모든 조회에 `userId` 조건)
- [x] `lib/chat.ts` — 요청 스키마, 제목 생성(앞 40자), DB 기록 → `MessageParam` 변환, `stop_reason` 안내 문구
- [x] `POST /api/chat` — 세션 확인 → 검증 → 소유자 확인(404) → Claude 스트리밍 → 저장, `X-Conversation-Id` 헤더, 중단 시 받은 부분까지 저장
- [x] `GET/POST /api/conversations`, `GET/PATCH/DELETE /api/conversations/[id]`
- [ ] 실제 연동으로 확인: 첫 로그인 시 `users` / `accounts` / `sessions` 컬렉션이 만들어지는지
- [ ] 실제 연동으로 확인: `conversations`, `messages` 인덱스가 생성되는지

## 4. 프론트엔드 — 구현 완료, 수동 점검 필요

- [x] 로그인 페이지 (`(auth)/login`)
- [x] `(chat)/layout.tsx` — 로그인 확인 + 사이드바
- [x] 새 대화(`/`) / 기존 대화(`/c/[conversationId]`) 페이지
- [x] `Chat`, `MessageList`, `MessageInput`(Enter 전송, Shift+Enter 줄바꿈, 한글 조합 처리, 중지 버튼)
- [x] `Markdown` — GFM 표·목록, 코드 하이라이트, raw HTML 차단
- [x] `ConversationList` — 새 대화, 이동, 제목 변경, 삭제, 로그아웃
- [x] `(chat)`용 `error.tsx`, `not-found.tsx`(남의 대화나 없는 대화 접근 시 한국어 안내) 추가 — 레이아웃 오류용 `app/error.tsx`, 404용 `app/not-found.tsx`도 추가
- [x] 대화 전환 시 보일 `loading.tsx`(스켈레톤) 추가
- [ ] 로그인한 상태에서 오류·404·로딩 화면이 사이드바와 함께 잘 보이는지 확인 (`.env.local` 준비 후)
- [ ] 라이트/다크 모드에서 코드 블록 테마(`github-dark`)가 잘 보이는지 확인

## 5. 수동 기능 점검 (MVP 인수 기준)

- [ ] Google 로그인 → 로그아웃 → GitHub 로그인
- [ ] 로그인하지 않고 `/`, `/c/<id>`에 접근하면 `/login`으로 이동
- [ ] 새 대화에서 메시지 전송 → 응답이 한 글자씩 스트리밍 → URL이 `/c/<id>`로 바뀌고 사이드바에 제목(앞 40자) 표시
- [ ] 기존 대화에 이어서 질문하면 앞 맥락을 기억함
- [ ] 새로고침 후에도 기록이 그대로 남음
- [ ] 응답 중 "중지" → 받은 부분까지 저장되고, 이어서 대화 가능
- [ ] 제목 변경 / 삭제 → 사이드바 반영, 보고 있던 대화를 지우면 `/`로 이동
- [ ] 마크다운: 코드 블록 하이라이트, 표, 목록이 올바르게 보임
- [ ] 다른 계정으로 남의 `/c/<id>`와 `/api/conversations/<id>`에 접근하면 404
- [ ] 아주 긴 답변을 요청했을 때 `max_tokens` 안내 문구가 나오는지 (가능하면)
- [ ] 잘못된 API 키, 네트워크 오류 시 입력창 위에 한국어 오류가 보이고 입력 내용이 복구되는지

## 6. 테스트 보강

### 단위 테스트 (Vitest)
- [x] 제목 생성, 요청 스키마, `toClaudeMessages`, `toObjectId` (13개)
- [x] **repository 사용자 격리 테스트** — `mongodb-memory-server`로 사용자 A의 대화를 사용자 B가 조회 / 이름 변경 / 삭제할 수 없는지 검증 (`tests/unit/repositories.test.ts`, 10개)
- [x] `deleteConversation`이 해당 대화의 메시지만 지우는지 검증
- [x] `/api/chat` 라우트 테스트 — `auth`와 Anthropic SDK를 모킹해 401 / 400 / 404, 텍스트 델타 전달, `stop_reason` 안내, 중단 시 부분 저장, 연결 오류(429·500·503) 응답을 확인 (`tests/unit/chat-route.test.ts`, 17개)
- [x] `/api/conversations`, `/api/conversations/[id]` 라우트 테스트 (401, PATCH 400, 남의 대화 404, DELETE 204) (`tests/unit/conversations-route.test.ts`, 18개)

### E2E (Playwright)
- [ ] E2E 실행에 필요한 환경 정리 (`.env.local` 없이 dev 서버를 띄우면 `auth()`에서 환경 변수 오류가 남)
- [ ] **테스트용 인증**: 테스트 DB에 사용자와 세션을 미리 넣고 세션 쿠키를 주입하는 fixture
- [ ] **Claude 모킹**: 테스트 환경에서 `ANTHROPIC_BASE_URL`을 가짜 SSE 서버로 지정 (실제 API 호출 금지)
- [ ] 시나리오: 로그인 → 메시지 전송 → 스트리밍 표시 → 새로고침 후 기록 유지 → 제목 변경 → 대화 삭제
- [ ] 위 작업을 마치면 `playwright.config.ts`의 "로그인 전 화면만" 주석과 CLAUDE.md 테스트 방침 갱신

## 7. 배포 (Vercel + MongoDB Atlas)

- [ ] `npm run build`가 로컬에서 성공하는지 확인
- [ ] GitHub 저장소 생성 후 푸시, Vercel 프로젝트 연결
- [ ] Vercel 환경 변수에 7개 키 등록 (`AUTH_SECRET`은 프로덕션용으로 새로 생성)
- [ ] Atlas Network Access에서 Vercel 접속 허용
- [ ] Google / GitHub OAuth 앱에 프로덕션 콜백 `https://<domain>/api/auth/callback/<provider>` 추가
- [ ] `/api/chat`의 `maxDuration = 300`이 Vercel 요금제 한도 안인지 확인
- [ ] 프로덕션에서 5번 수동 점검을 한 번 더 진행

## 8. 마무리 체크 (매 작업 후)

- [ ] `npm run lint`
- [ ] `npm run typecheck`
- [ ] `npm test`

---

### MVP 범위 밖 (요청이 있을 때만)

이미지·파일 첨부, 모델 선택 UI, 이메일/비밀번호 로그인, 대화 공유·검색·내보내기, 사용량 제한·과금,
모바일용 접이식 사이드바, 코드 블록 복사 버튼, Claude로 제목 생성.
