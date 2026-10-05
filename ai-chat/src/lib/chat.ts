import type Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import type { ChatMessage } from "@/types/chat";

export const MAX_MESSAGE_LENGTH = 20000;
export const TITLE_MAX_LENGTH = 40;

export const chatRequestSchema = z.object({
  conversationId: z.string().optional(),
  message: z.string().trim().min(1).max(MAX_MESSAGE_LENGTH),
});

export const renameRequestSchema = z.object({
  title: z.string().trim().min(1).max(100),
});

/** 첫 메시지로 대화 제목을 만든다. 줄바꿈과 연속 공백은 하나로 합친다. */
export function makeTitle(firstMessage: string): string {
  const flat = firstMessage.replace(/\s+/g, " ").trim();
  if (flat.length <= TITLE_MAX_LENGTH) return flat || "새 대화";
  return flat.slice(0, TITLE_MAX_LENGTH).trimEnd() + "…";
}

/**
 * DB의 대화 기록을 Claude API의 messages 배열로 바꾼다.
 * 이전 응답이 실패해 같은 역할이 연속되면 하나로 합치고, 빈 메시지는 버린다.
 */
export function toClaudeMessages(history: Pick<ChatMessage, "role" | "content">[]): Anthropic.MessageParam[] {
  const result: Anthropic.MessageParam[] = [];
  for (const { role, content } of history) {
    if (!content.trim()) continue;
    const last = result.at(-1);
    if (last && last.role === role && typeof last.content === "string") {
      last.content = `${last.content}\n\n${content}`;
    } else {
      result.push({ role, content });
    }
  }
  // 첫 메시지는 반드시 user여야 한다.
  while (result[0]?.role === "assistant") result.shift();
  return result;
}

export const STOP_NOTICES: Partial<Record<string, string>> = {
  max_tokens: "\n\n> ⚠️ 응답이 최대 길이에 도달해 중간에 끊겼습니다.",
  refusal: "\n\n> ⚠️ 이 요청에는 답변할 수 없습니다.",
};
