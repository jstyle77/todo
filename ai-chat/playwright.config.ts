import { defineConfig, devices } from "@playwright/test";

// E2E 테스트는 실제 MongoDB와 OAuth 로그인이 필요해 아직 로그인 전 화면만 검사한다.
// 로그인 이후 흐름(메시지 전송, 기록 유지, 삭제)은 테스트용 인증과 Claude 모킹을 준비한 뒤 추가한다.
export default defineConfig({
  testDir: "./tests/e2e",
  use: { baseURL: "http://localhost:3000" },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000/login",
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
