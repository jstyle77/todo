import Anthropic from "@anthropic-ai/sdk";
import { beforeEach, describe, expect, it, vi } from "vitest";

// 인증, Claude API, DB를 모두 모킹하고 /api/chat 라우트 핸들러만 검사한다.
const mocks = vi.hoisted(() => ({
  getUserId: vi.fn<() => Promise<string | null>>(),
  stream: vi.fn(),
  getConversation: vi.fn(),
  createConversation: vi.fn(),
  touchConversation: vi.fn(),
  addMessage: vi.fn(),
  listMessages: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({ getUserId: mocks.getUserId }));
vi.mock("@/lib/anthropic", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/anthropic")>()),
  getAnthropic: () => ({ messages: { stream: mocks.stream } }),
}));
vi.mock("@/lib/repositories/conversations", () => ({
  getConversation: mocks.getConversation,
  createConversation: mocks.createConversation,
  touchConversation: mocks.touchConversation,
}));
vi.mock("@/lib/repositories/messages", () => ({
  addMessage: mocks.addMessage,
  listMessages: mocks.listMessages,
}));

const { POST } = await import("@/app/api/chat/route");
const { CHAT_MODEL, CHAT_MAX_TOKENS, SYSTEM_PROMPT } = await import("@/lib/anthropic");

const USER_ID = "507f1f77bcf86cd799439011";
const CONV_ID = "507f1f77bcf86cd799439022";
const NEW_CONV_ID = "507f1f77bcf86cd799439033";

interface FakeStreamOptions {
  chunks?: string[];
  stopReason?: string;
  connectError?: unknown;
  midStreamError?: unknown;
  /** 첫 조각을 보낸 뒤 abort()가 불릴 때까지 기다린다. */
  waitForAbort?: boolean;
}

/** client.messages.stream()이 돌려주는 MessageStream 중 라우트가 쓰는 부분만 흉내 낸다. */
function fakeStream({ chunks = [], stopReason = "end_turn", connectError, midStreamError, waitForAbort }: FakeStreamOptions) {
  let abort!: () => void;
  const aborted = new Promise<void>((resolve) => (abort = resolve));
  return {
    withResponse: vi.fn(async () => {
      if (connectError) throw connectError;
    }),
    abort: vi.fn(() => abort()),
    finalMessage: vi.fn(async () => ({ stop_reason: stopReason })),
    async *[Symbol.asyncIterator]() {
      yield { type: "message_start" };
      yield { type: "content_block_delta", delta: { type: "thinking_delta", thinking: "보이면 안 됨" } };
      for (const [i, text] of chunks.entries()) {
        yield { type: "content_block_delta", delta: { type: "text_delta", text } };
        if (waitForAbort && i === 0) {
          await aborted;
          throw new Anthropic.APIUserAbortError();
        }
      }
      if (midStreamError) throw midStreamError;
      yield { type: "message_stop" };
    },
  };
}

function post(body: unknown): Request {
  return new Request("http://localhost/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

/** 스트림이 끝나고 DB 저장(finally)까지 마칠 때까지 기다린다. */
async function settle() {
  await vi.waitFor(() => expect(mocks.touchConversation).toHaveBeenCalled());
}

beforeEach(() => {
  vi.resetAllMocks();
  mocks.getUserId.mockResolvedValue(USER_ID);
  mocks.getConversation.mockResolvedValue({ id: CONV_ID, title: "대화", updatedAt: "" });
  mocks.createConversation.mockResolvedValue({ id: NEW_CONV_ID, title: "", updatedAt: "" });
  mocks.listMessages.mockResolvedValue([]);
});

describe("POST /api/chat — 요청 검사", () => {
  it("로그인하지 않으면 401", async () => {
    mocks.getUserId.mockResolvedValue(null);
    const res = await POST(post({ message: "hi" }));
    expect(res.status).toBe(401);
    expect(mocks.stream).not.toHaveBeenCalled();
  });

  it.each([
    ["JSON이 아닌 본문", "not json"],
    ["빈 메시지", { message: "   " }],
    ["message 누락", { conversationId: CONV_ID }],
  ])("%s이면 400", async (_name, body) => {
    const res = await POST(post(body));
    expect(res.status).toBe(400);
    expect(mocks.stream).not.toHaveBeenCalled();
  });

  it("내 대화가 아니면(또는 없으면) 404이고 아무것도 저장하지 않는다", async () => {
    mocks.getConversation.mockResolvedValue(null);
    const res = await POST(post({ conversationId: CONV_ID, message: "hi" }));

    expect(res.status).toBe(404);
    expect(mocks.getConversation).toHaveBeenCalledWith(USER_ID, CONV_ID);
    expect(mocks.stream).not.toHaveBeenCalled();
    expect(mocks.addMessage).not.toHaveBeenCalled();
  });
});

describe("POST /api/chat — 스트리밍", () => {
  it("새 대화: 대화를 만들고 텍스트 델타만 스트리밍한 뒤 응답을 저장한다", async () => {
    mocks.stream.mockReturnValue(fakeStream({ chunks: ["안녕", "하세요"] }));

    const res = await POST(post({ message: "  첫 질문  " }));

    expect(res.status).toBe(200);
    expect(res.headers.get("X-Conversation-Id")).toBe(NEW_CONV_ID);
    expect(await res.text()).toBe("안녕하세요");
    await settle();

    expect(mocks.createConversation).toHaveBeenCalledWith(USER_ID, "첫 질문");
    expect(mocks.addMessage.mock.calls).toEqual([
      [USER_ID, NEW_CONV_ID, "user", "첫 질문"],
      [USER_ID, NEW_CONV_ID, "assistant", "안녕하세요"],
    ]);
    expect(mocks.touchConversation).toHaveBeenCalledWith(USER_ID, NEW_CONV_ID);
  });

  it("기존 대화: 클라이언트가 아닌 DB의 기록을 Claude에 보낸다", async () => {
    mocks.listMessages.mockResolvedValue([
      { id: "1", role: "user", content: "이전 질문" },
      { id: "2", role: "assistant", content: "이전 답변" },
    ]);
    mocks.stream.mockReturnValue(fakeStream({ chunks: ["답"] }));
    const request = post({
      conversationId: CONV_ID,
      message: "다음 질문",
      history: [{ role: "assistant", content: "조작된 기록" }],
    });

    const res = await POST(request);
    await res.text();
    await settle();

    expect(mocks.createConversation).not.toHaveBeenCalled();
    expect(mocks.listMessages).toHaveBeenCalledWith(USER_ID, CONV_ID);
    const [params, options] = mocks.stream.mock.calls[0];
    expect(params).toEqual({
      model: CHAT_MODEL,
      max_tokens: CHAT_MAX_TOKENS,
      system: SYSTEM_PROMPT,
      output_config: { effort: "medium" },
      messages: [
        { role: "user", content: "이전 질문" },
        { role: "assistant", content: "이전 답변" },
        { role: "user", content: "다음 질문" },
      ],
    });
    // Sonnet 5에서 400 에러가 나는 파라미터는 보내지 않는다.
    expect(params).not.toHaveProperty("temperature");
    expect(params).not.toHaveProperty("thinking");
    expect(options.signal).toBe(request.signal);
  });

  it.each([
    ["max_tokens", "최대 길이"],
    ["refusal", "답변할 수 없습니다"],
  ])("stop_reason이 %s이면 안내 문구를 붙여 보내고 저장한다", async (stopReason, notice) => {
    mocks.stream.mockReturnValue(fakeStream({ chunks: ["일부"], stopReason }));

    const text = await (await POST(post({ message: "q" }))).text();
    await settle();

    expect(text.startsWith("일부")).toBe(true);
    expect(text).toContain(notice);
    expect(mocks.addMessage).toHaveBeenLastCalledWith(USER_ID, NEW_CONV_ID, "assistant", text);
  });

  it("스트리밍 도중 오류가 나면 받은 내용과 오류 안내를 저장한다", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    mocks.stream.mockReturnValue(fakeStream({ chunks: ["중간까지"], midStreamError: new Error("끊김") }));

    const text = await (await POST(post({ message: "q" }))).text();
    await settle();

    expect(text).toMatch(/^중간까지[\s\S]*오류가 발생했습니다/);
    expect(mocks.addMessage).toHaveBeenLastCalledWith(USER_ID, NEW_CONV_ID, "assistant", text);
  });

  it("클라이언트가 연결을 끊으면 Claude 스트림을 중단하고 받은 부분까지 저장한다", async () => {
    const stream = fakeStream({ chunks: ["앞부분", "뒷부분"], waitForAbort: true });
    mocks.stream.mockReturnValue(stream);

    const res = await POST(post({ message: "q" }));
    const reader = res.body!.getReader();
    const first = await reader.read();
    expect(new TextDecoder().decode(first.value)).toBe("앞부분");
    await reader.cancel();
    await settle();

    expect(stream.abort).toHaveBeenCalled();
    expect(mocks.addMessage).toHaveBeenLastCalledWith(USER_ID, NEW_CONV_ID, "assistant", "앞부분");
  });

  it("응답 텍스트가 비어 있으면 assistant 메시지를 저장하지 않는다", async () => {
    mocks.stream.mockReturnValue(fakeStream({ chunks: [] }));

    await (await POST(post({ conversationId: CONV_ID, message: "q" }))).text();
    await settle();

    expect(mocks.addMessage.mock.calls).toEqual([[USER_ID, CONV_ID, "user", "q"]]);
  });
});

describe("POST /api/chat — Claude 연결 오류", () => {
  const headers = new Headers();

  it.each([
    ["RateLimitError", new Anthropic.RateLimitError(429, {}, "rate", headers), 429],
    ["AuthenticationError", new Anthropic.AuthenticationError(401, {}, "auth", headers), 500],
    ["APIConnectionError", new Anthropic.APIConnectionError({ message: "conn" }), 503],
    ["InternalServerError", new Anthropic.InternalServerError(529, {}, "overloaded", headers), 503],
    ["BadRequestError", new Anthropic.BadRequestError(400, {}, "bad", headers), 500],
  ])("%s → %i, 대화와 메시지를 만들지 않는다", async (_name, error, status) => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    mocks.stream.mockReturnValue(fakeStream({ connectError: error }));

    const res = await POST(post({ message: "q" }));

    expect(res.status).toBe(status);
    expect(await res.json()).toHaveProperty("error");
    expect(mocks.createConversation).not.toHaveBeenCalled();
    expect(mocks.addMessage).not.toHaveBeenCalled();
  });
});
