import Anthropic from "@anthropic-ai/sdk";
import { getUserId } from "@/lib/auth";
import { CHAT_MAX_TOKENS, CHAT_MODEL, SYSTEM_PROMPT, getAnthropic } from "@/lib/anthropic";
import { STOP_NOTICES, chatRequestSchema, makeTitle, toClaudeMessages } from "@/lib/chat";
import {
  createConversation,
  getConversation,
  touchConversation,
} from "@/lib/repositories/conversations";
import { addMessage, listMessages } from "@/lib/repositories/messages";

export const maxDuration = 300;

function jsonError(status: number, error: string) {
  return Response.json({ error }, { status });
}

/** Claude API 연결 단계의 오류를 HTTP 응답으로 바꾼다. */
function claudeErrorResponse(err: unknown): Response {
  if (err instanceof Anthropic.RateLimitError) {
    return jsonError(429, "요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.");
  }
  if (err instanceof Anthropic.AuthenticationError || err instanceof Anthropic.PermissionDeniedError) {
    console.error("Claude API 인증 오류", err);
    return jsonError(500, "서버 설정 오류입니다. 관리자에게 문의해 주세요.");
  }
  if (err instanceof Anthropic.APIConnectionError) {
    return jsonError(503, "AI 서버에 연결할 수 없습니다. 잠시 후 다시 시도해 주세요.");
  }
  if (err instanceof Anthropic.APIError && err.status !== undefined && err.status >= 500) {
    return jsonError(503, "AI 서버가 일시적으로 응답하지 않습니다. 잠시 후 다시 시도해 주세요.");
  }
  console.error("Claude API 오류", err);
  return jsonError(500, "응답을 생성하지 못했습니다.");
}

export async function POST(request: Request) {
  const userId = await getUserId();
  if (!userId) return jsonError(401, "로그인이 필요합니다.");

  const parsed = chatRequestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return jsonError(400, "메시지가 올바르지 않습니다.");
  const { conversationId: requestedId, message } = parsed.data;

  // 대화 기록은 클라이언트가 보낸 것이 아니라 DB에서 불러온다.
  let history: { role: "user" | "assistant"; content: string }[] = [];
  if (requestedId) {
    const conversation = await getConversation(userId, requestedId);
    if (!conversation) return jsonError(404, "대화를 찾을 수 없습니다.");
    history = await listMessages(userId, requestedId);
  }

  const stream = getAnthropic().messages.stream(
    {
      model: CHAT_MODEL,
      max_tokens: CHAT_MAX_TOKENS,
      system: SYSTEM_PROMPT,
      output_config: { effort: "medium" },
      messages: toClaudeMessages([...history, { role: "user", content: message }]),
    },
    { signal: request.signal },
  );

  // HTTP 응답을 먼저 받아서 연결 오류를 상태 코드로 돌려준다.
  try {
    await stream.withResponse();
  } catch (err) {
    return claudeErrorResponse(err);
  }

  // 연결에 성공한 뒤에 저장한다. 실패한 요청이 빈 대화를 남기지 않도록.
  const conversationId = requestedId ?? (await createConversation(userId, makeTitle(message))).id;
  await addMessage(userId, conversationId, "user", message);

  const encoder = new TextEncoder();
  const body = new ReadableStream<Uint8Array>({
    async start(controller) {
      let text = "";
      const send = (chunk: string) => {
        text += chunk;
        controller.enqueue(encoder.encode(chunk));
      };

      try {
        for await (const event of stream) {
          if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
            send(event.delta.text);
          }
        }
        const final = await stream.finalMessage();
        const notice = final.stop_reason ? STOP_NOTICES[final.stop_reason] : undefined;
        if (notice) send(notice);
      } catch (err) {
        if (!(err instanceof Anthropic.APIUserAbortError)) {
          console.error("스트리밍 중 오류", err);
          send("\n\n> ⚠️ 응답을 받는 중 오류가 발생했습니다.");
        }
      } finally {
        // 사용자가 중간에 끊었더라도 그때까지 받은 내용은 저장한다.
        if (text.trim()) await addMessage(userId, conversationId, "assistant", text);
        await touchConversation(userId, conversationId);
        try {
          controller.close();
        } catch {
          // 클라이언트 연결이 이미 끊긴 경우
        }
      }
    },
    cancel() {
      stream.abort();
    },
  });

  return new Response(body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Conversation-Id": conversationId,
    },
  });
}
