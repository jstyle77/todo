# CLAUDE.md

이 파일은 이 저장소에서 작업하는 Claude Code에게 프로젝트의 목적, 구조, 규칙을 안내합니다.

## 프로젝트 개요

**ai-chat** — 여러 사용자가 로그인해 Claude와 자유 주제로 대화하는 ChatGPT형 웹 챗봇.

### MVP 기능 범위

1. **소셜 로그인** — Google / GitHub 계정으로 로그인 (Auth.js)
2. **스트리밍 응답** — Claude의 답변을 실시간으로 한 글자씩 표시
3. **대화 기록 저장** — 사용자별 대화 목록을 사이드바에 표시, 새 대화 생성 / 이어서 대화 / 제목 변경 / 삭제
4. **마크다운 렌더링** — 코드 블록 구문 강조, 표, 목록 등 표시

### MVP 범위 밖 (나중에)

- 이미지 / 파일 첨부
- 사용자가 고르는 모델 선택 UI
- 이메일 + 비밀번호 로그인
- 대화 공유, 검색, 내보내기
- 사용량 제한 / 과금

범위 밖 기능은 요청이 없으면 구현하지 마세요.

## 기술 스택

| 영역 | 선택 |
|---|---|
| 프레임워크 | Next.js (App Router) + TypeScript (strict) |
| UI | Tailwind CSS + shadcn/ui |
| LLM | Claude API — `@anthropic-ai/sdk` |
| 기본 모델 | `claude-sonnet-5` (Claude Sonnet 5) |
| 인증 | Auth.js (`next-auth` v5) + `@auth/mongodb-adapter` |
| DB | MongoDB (공식 `mongodb` 드라이버) |
| 마크다운 | `react-markdown` + `remark-gfm` + `rehype-highlight` |
| 검증 | `zod` (API 요청 본문, 환경 변수) |
| 테스트 | Vitest (단위), Playwright (E2E) |
| 패키지 매니저 | npm |
| 배포 | Vercel + MongoDB Atlas |

## 디렉터리 구조

```
src/
  app/
    (auth)/login/page.tsx        # 로그인 페이지
    (chat)/
      layout.tsx                 # 사이드바(대화 목록) + 본문 레이아웃
      page.tsx                   # 새 대화 화면
      c/[conversationId]/page.tsx  # 기존 대화 화면
    api/
      auth/[...nextauth]/route.ts  # Auth.js 핸들러
      chat/route.ts              # POST: 메시지 전송 → 스트리밍 응답
      conversations/route.ts     # GET: 목록, POST: 생성
      conversations/[id]/route.ts  # GET / PATCH(제목) / DELETE
  components/
    ui/                          # shadcn/ui 생성 컴포넌트 (직접 수정 최소화)
    chat/                        # MessageList, MessageInput, Markdown 등
    sidebar/                     # ConversationList 등
  lib/
    anthropic.ts                 # Anthropic 클라이언트 싱글턴 + 모델 상수
    db.ts                        # MongoClient 싱글턴 (서버리스용 전역 캐시)
    auth.ts                      # Auth.js 설정
    env.ts                       # zod로 환경 변수 검증
    repositories/                # conversations, messages DB 접근 함수
  types/
tests/
  unit/
  e2e/
```

## 데이터 모델 (MongoDB)

Auth.js 어댑터가 `users`, `accounts`, `sessions`, `verification_tokens` 컬렉션을 관리합니다. 앱 컬렉션은 다음과 같습니다.

```ts
// conversations
{
  _id: ObjectId,
  userId: ObjectId,        // users._id
  title: string,           // 첫 메시지로 자동 생성, 사용자가 변경 가능
  createdAt: Date,
  updatedAt: Date,         // 사이드바 정렬 기준
}
// 인덱스: { userId: 1, updatedAt: -1 }

// messages
{
  _id: ObjectId,
  conversationId: ObjectId,
  userId: ObjectId,
  role: "user" | "assistant",
  content: string,
  createdAt: Date,
}
// 인덱스: { conversationId: 1, createdAt: 1 }
```

## Claude API 사용 규칙

- 클라이언트는 `src/lib/anthropic.ts`에서 한 번만 생성합니다. 모델 ID는 상수 `CHAT_MODEL = "claude-sonnet-5"`로 관리하고, 다른 파일에 하드코딩하지 않습니다. 모델 ID에 날짜 접미사를 붙이지 마세요.
- **Claude API 호출은 서버(Route Handler)에서만** 합니다. `ANTHROPIC_API_KEY`가 클라이언트 번들에 들어가면 안 됩니다 (`NEXT_PUBLIC_` 접두사 금지).
- 응답은 `client.messages.stream(...)`으로 스트리밍하고, `content_block_delta` 이벤트 중 `text_delta`의 텍스트만 `ReadableStream`으로 클라이언트에 전달합니다. `max_tokens`는 64000을 기본으로 합니다.
- Sonnet 5에서는 `thinking`을 생략하면 adaptive thinking으로 동작합니다. `budget_tokens`와 `temperature` / `top_p` / `top_k`는 Sonnet 5에서 400 에러가 나므로 사용하지 마세요. 일반 대화는 응답 속도를 위해 `output_config: { effort: "medium" }`을 기본으로 합니다.
- assistant 메시지 미리 채우기(prefill)는 Sonnet 5에서 400 에러가 나므로 사용하지 마세요.
- 요청마다 해당 대화의 이전 메시지를 DB에서 불러와 `messages` 배열로 보냅니다. 클라이언트가 보낸 대화 기록은 신뢰하지 않습니다.
- 시스템 프롬프트는 `src/lib/anthropic.ts`의 상수 하나로 관리합니다. 날짜·사용자 이름처럼 매번 바뀌는 값은 넣지 않습니다 (프롬프트 캐싱이 깨짐).
- 에러는 SDK의 타입별 예외 클래스로 구분합니다 (`Anthropic.RateLimitError`, `Anthropic.APIError` 등). 에러 메시지 문자열로 분기하지 마세요.
- 스트림을 마치면 `stop_reason`을 확인합니다. `max_tokens`나 `refusal`이면 사용자에게 알립니다.

### `/api/chat` 처리 흐름

1. 세션 확인 → 없으면 401
2. 요청 본문 zod 검증: `{ conversationId?: string, message: string }`
3. `conversationId`가 없으면 새 대화 생성. 있으면 소유자가 현재 사용자인지 확인 (아니면 404)
4. user 메시지를 DB에 저장
5. 대화의 전체 메시지를 불러와 Claude 스트리밍 호출
6. 텍스트 델타를 클라이언트로 스트리밍 (응답 헤더에 `X-Conversation-Id` 포함)
7. 스트림이 끝나면 assistant 메시지 전체를 DB에 저장하고 `conversations.updatedAt` 갱신
8. 새 대화의 첫 응답이면 제목 생성 (첫 메시지 앞 40자, 또는 짧은 Claude 호출)

클라이언트가 중간에 연결을 끊으면 `request.signal`로 Claude 스트림도 중단하고, 그때까지 받은 내용을 저장합니다.

## 인증 / 보안 규칙

- 모든 API 라우트와 `(chat)` 페이지는 로그인이 필요합니다. 각 라우트 핸들러와 `(chat)/layout.tsx`·페이지에서 `auth()` / `getUserId()`로 확인합니다. (Next.js 16에서는 `middleware`가 `proxy`로 이름이 바뀌었습니다. 현재는 proxy를 쓰지 않습니다.)
- **모든 DB 조회에 `userId` 조건을 포함**해 다른 사용자의 대화에 접근할 수 없게 합니다. 이 작업은 repository 함수에서 강제합니다.
- 다른 사용자의 리소스에 접근하면 403 대신 404를 반환합니다 (존재 여부를 노출하지 않음).
- 마크다운 렌더링에서 raw HTML을 허용하지 않습니다 (`rehype-raw` 사용 금지).

## 환경 변수

`.env.local`에 두고 커밋하지 않습니다. `.env.example`에는 키 이름만 적습니다. `src/lib/env.ts`에서 zod로 검증합니다.

```
ANTHROPIC_API_KEY=
MONGODB_URI=
AUTH_SECRET=            # npx auth secret 으로 생성
AUTH_GOOGLE_ID=
AUTH_GOOGLE_SECRET=
AUTH_GITHUB_ID=
AUTH_GITHUB_SECRET=
```

## 명령어

```bash
npm run dev          # 개발 서버 (http://localhost:3000)
npm run build        # 프로덕션 빌드
npm run lint         # ESLint
npm run typecheck    # tsc --noEmit
npm test             # Vitest 단위 테스트
npm run test:e2e     # Playwright E2E 테스트
```

작업을 마치면 `npm run lint`, `npm run typecheck`, `npm test`를 실행해 통과를 확인합니다.

## 코딩 규칙

- TypeScript `strict` 모드. `any` 금지 — 필요하면 `unknown`으로 받고 좁혀서 사용합니다.
- SDK가 제공하는 타입(`Anthropic.MessageParam` 등)을 그대로 씁니다. 같은 구조의 타입을 새로 정의하지 마세요.
- 기본은 서버 컴포넌트이고, 상호작용이 필요한 컴포넌트에만 `"use client"`를 붙입니다.
- DB 접근은 `src/lib/repositories/`의 함수를 거칩니다. 라우트나 컴포넌트에서 컬렉션을 직접 조회하지 마세요.
- MongoClient는 `src/lib/db.ts`의 싱글턴을 재사용합니다 (Vercel 서버리스에서 연결 수 폭증 방지).
- UI 텍스트는 한국어로 작성합니다.
- shadcn/ui 컴포넌트는 `npx shadcn@latest add <name>`으로 추가합니다. 이 프로젝트의 shadcn 스타일(`base-nova`)은 Radix 대신 Base UI(`@base-ui/react`)를 쓰고, 클래스 병합에는 `cn` 패키지를 씁니다.
- Next.js 16에서는 `params`가 Promise입니다. 페이지·레이아웃은 `PageProps<"/경로">` / `LayoutProps<"/경로">` 타입을 쓰고 `await params`로 읽습니다. 타입은 `npx next typegen`으로 생성됩니다.

## 테스트 방침

- **단위 테스트 (Vitest)**: repository 함수(사용자 격리 포함), 요청 검증, 제목 생성 로직. Claude API는 모킹합니다.
- **E2E (Playwright)**: 목표는 로그인 → 메시지 전송 → 스트리밍 표시 → 새로고침 후 기록 유지 → 대화 삭제입니다. 테스트에서는 실제 Claude API 대신 모킹된 응답을 씁니다. **현재는 로그인 전 동작(로그인 페이지 이동, API 401)만 있습니다.** 로그인 이후 흐름은 테스트용 인증과 Claude 모킹을 준비한 뒤 추가합니다.
- 실제 Claude API를 호출하는 테스트는 비용이 드니 기본 테스트 실행에 포함하지 않습니다.

## 배포 (Vercel + MongoDB Atlas)

- Vercel 프로젝트 환경 변수에 위의 키를 모두 등록합니다.
- Atlas Network Access에서 Vercel의 접속을 허용합니다.
- 스트리밍 라우트(`/api/chat`)는 Node.js 런타임을 사용하고, 긴 응답을 위해 `export const maxDuration`을 적절히 설정합니다.
- OAuth 앱의 콜백 URL에 프로덕션 도메인(`https://<domain>/api/auth/callback/<provider>`)을 등록합니다.

## Next.js 버전 안내

@AGENTS.md
