# AI Chat

Claude와 대화하는 ChatGPT형 웹 챗봇입니다. (Next.js 16 · Claude Sonnet 5 · MongoDB · Auth.js)

## 시작하기

1. 패키지 설치

   ```bash
   npm install
   ```

2. `.env.example`을 `.env.local`로 복사하고 값을 채웁니다.
   - `ANTHROPIC_API_KEY`: [Claude Console](https://platform.claude.com)에서 발급
   - `MONGODB_URI`: MongoDB Atlas 또는 로컬 MongoDB 연결 문자열 (DB 이름 포함)
   - `AUTH_SECRET`: `npx auth secret`으로 생성
   - Google / GitHub OAuth 앱을 만들고 콜백 URL을 `http://localhost:3000/api/auth/callback/google`, `.../github`로 등록

3. 개발 서버 실행

   ```bash
   npm run dev
   ```

   http://localhost:3000 에 접속해 로그인합니다.

## 명령어

| 명령어 | 설명 |
|---|---|
| `npm run dev` | 개발 서버 |
| `npm run build` | 프로덕션 빌드 |
| `npm run lint` | ESLint |
| `npm run typecheck` | 타입 검사 |
| `npm test` | 단위 테스트 (Vitest) |
| `npm run test:e2e` | E2E 테스트 (Playwright, 처음엔 `npx playwright install chromium` 필요) |

자세한 설계와 규칙은 [CLAUDE.md](./CLAUDE.md)를 참고하세요.
