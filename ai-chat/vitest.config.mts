import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      // 서버 전용 모듈을 테스트에서 불러올 수 있도록 빈 모듈로 바꾼다.
      "server-only": fileURLToPath(new URL("./node_modules/server-only/empty.js", import.meta.url)),
    },
  },
  test: {
    include: ["tests/unit/**/*.test.ts"],
    environment: "node",
    // mongodb-memory-server는 처음 실행할 때 MongoDB 바이너리를 내려받는다.
    hookTimeout: 120_000,
  },
});
