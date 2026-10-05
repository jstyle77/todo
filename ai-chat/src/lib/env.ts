import "server-only";
import { z } from "zod";

const envSchema = z.object({
  ANTHROPIC_API_KEY: z.string().min(1),
  MONGODB_URI: z.string().min(1),
  AUTH_SECRET: z.string().min(1),
  AUTH_GOOGLE_ID: z.string().min(1),
  AUTH_GOOGLE_SECRET: z.string().min(1),
  AUTH_GITHUB_ID: z.string().min(1),
  AUTH_GITHUB_SECRET: z.string().min(1),
});

export type Env = z.infer<typeof envSchema>;

let cached: Env | undefined;

/** 환경 변수를 처음 사용할 때 검증한다. (빌드 시점에 값이 없어도 import는 실패하지 않도록) */
export function env(): Env {
  if (!cached) {
    const result = envSchema.safeParse(process.env);
    if (!result.success) {
      const missing = result.error.issues.map((i) => i.path.join(".")).join(", ");
      throw new Error(`환경 변수가 올바르지 않습니다: ${missing} (.env.example 참고)`);
    }
    cached = result.data;
  }
  return cached;
}
