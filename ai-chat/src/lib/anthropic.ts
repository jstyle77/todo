import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { env } from "@/lib/env";

export const CHAT_MODEL = "claude-sonnet-5";
export const CHAT_MAX_TOKENS = 64000;

// 매 요청마다 바뀌는 값(날짜, 사용자 이름 등)을 넣지 않는다. 프롬프트 캐싱이 깨진다.
export const SYSTEM_PROMPT =
  "당신은 친절하고 유능한 AI 어시스턴트입니다. 사용자가 쓴 언어로 답하고, " +
  "필요하면 마크다운(목록, 표, 코드 블록)을 사용해 읽기 쉽게 정리하세요.";

let client: Anthropic | undefined;

export function getAnthropic(): Anthropic {
  if (!client) {
    client = new Anthropic({ apiKey: env().ANTHROPIC_API_KEY });
  }
  return client;
}
