import { beforeEach, describe, expect, it, vi } from "vitest";

// 인증과 DB를 모킹하고 /api/conversations 라우트 핸들러만 검사한다.
const mocks = vi.hoisted(() => ({
  getUserId: vi.fn<() => Promise<string | null>>(),
  listConversations: vi.fn(),
  createConversation: vi.fn(),
  getConversation: vi.fn(),
  renameConversation: vi.fn(),
  deleteConversation: vi.fn(),
  listMessages: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({ getUserId: mocks.getUserId }));
vi.mock("@/lib/repositories/conversations", () => ({
  listConversations: mocks.listConversations,
  createConversation: mocks.createConversation,
  getConversation: mocks.getConversation,
  renameConversation: mocks.renameConversation,
  deleteConversation: mocks.deleteConversation,
}));
vi.mock("@/lib/repositories/messages", () => ({ listMessages: mocks.listMessages }));

const collection = await import("@/app/api/conversations/route");
const item = await import("@/app/api/conversations/[id]/route");

const USER_ID = "507f1f77bcf86cd799439011";
const CONV_ID = "507f1f77bcf86cd799439022";
const conversation = { id: CONV_ID, title: "대화", updatedAt: "2026-10-05T00:00:00.000Z" };

const url = `http://localhost/api/conversations/${CONV_ID}`;
const ctx = (id = CONV_ID) => ({ params: Promise.resolve({ id }) });
const patch = (body: unknown) =>
  new Request(url, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });

beforeEach(() => {
  vi.resetAllMocks();
  mocks.getUserId.mockResolvedValue(USER_ID);
});

describe("로그인하지 않으면 모든 핸들러가 401이고 DB에 접근하지 않는다", () => {
  beforeEach(() => mocks.getUserId.mockResolvedValue(null));

  it.each([
    ["GET /api/conversations", () => collection.GET()],
    ["POST /api/conversations", () => collection.POST()],
    ["GET /api/conversations/[id]", () => item.GET(new Request(url), ctx())],
    ["PATCH /api/conversations/[id]", () => item.PATCH(patch({ title: "x" }), ctx())],
    ["DELETE /api/conversations/[id]", () => item.DELETE(new Request(url, { method: "DELETE" }), ctx())],
  ])("%s", async (_name, call) => {
    const res = await call();
    expect(res.status).toBe(401);
    for (const fn of Object.values(mocks)) {
      if (fn !== mocks.getUserId) expect(fn).not.toHaveBeenCalled();
    }
  });
});

describe("GET /api/conversations", () => {
  it("현재 사용자의 대화 목록을 돌려준다", async () => {
    mocks.listConversations.mockResolvedValue([conversation]);

    const res = await collection.GET();

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ conversations: [conversation] });
    expect(mocks.listConversations).toHaveBeenCalledWith(USER_ID);
  });
});

describe("POST /api/conversations", () => {
  it("'새 대화' 제목으로 대화를 만들고 201", async () => {
    mocks.createConversation.mockResolvedValue({ ...conversation, title: "새 대화" });

    const res = await collection.POST();

    expect(res.status).toBe(201);
    expect(await res.json()).toEqual({ conversation: { ...conversation, title: "새 대화" } });
    expect(mocks.createConversation).toHaveBeenCalledWith(USER_ID, "새 대화");
  });
});

describe("GET /api/conversations/[id]", () => {
  it("대화와 메시지를 돌려준다", async () => {
    const messages = [{ id: "m1", role: "user", content: "안녕" }];
    mocks.getConversation.mockResolvedValue(conversation);
    mocks.listMessages.mockResolvedValue(messages);

    const res = await item.GET(new Request(url), ctx());

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ conversation, messages });
    expect(mocks.getConversation).toHaveBeenCalledWith(USER_ID, CONV_ID);
    expect(mocks.listMessages).toHaveBeenCalledWith(USER_ID, CONV_ID);
  });

  it("남의 대화나 없는 대화는 404이고 메시지를 조회하지 않는다", async () => {
    mocks.getConversation.mockResolvedValue(null);

    const res = await item.GET(new Request(url), ctx());

    expect(res.status).toBe(404);
    expect(mocks.listMessages).not.toHaveBeenCalled();
  });
});

describe("PATCH /api/conversations/[id]", () => {
  it("앞뒤 공백을 지운 제목으로 바꾼다", async () => {
    mocks.renameConversation.mockResolvedValue(true);

    const res = await item.PATCH(patch({ title: "  새 제목  " }), ctx());

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
    expect(mocks.renameConversation).toHaveBeenCalledWith(USER_ID, CONV_ID, "새 제목");
  });

  it.each([
    ["JSON이 아닌 본문", "not json"],
    ["빈 제목", { title: "   " }],
    ["100자 초과 제목", { title: "가".repeat(101) }],
    ["title 누락", {}],
    ["문자열이 아닌 제목", { title: 123 }],
  ])("%s이면 400이고 저장하지 않는다", async (_name, body) => {
    const res = await item.PATCH(patch(body), ctx());

    expect(res.status).toBe(400);
    expect(mocks.renameConversation).not.toHaveBeenCalled();
  });

  it("남의 대화나 없는 대화는 404", async () => {
    mocks.renameConversation.mockResolvedValue(false);

    const res = await item.PATCH(patch({ title: "탈취" }), ctx());

    expect(res.status).toBe(404);
  });
});

describe("DELETE /api/conversations/[id]", () => {
  it("삭제하면 본문 없이 204", async () => {
    mocks.deleteConversation.mockResolvedValue(true);

    const res = await item.DELETE(new Request(url, { method: "DELETE" }), ctx());

    expect(res.status).toBe(204);
    expect(await res.text()).toBe("");
    expect(mocks.deleteConversation).toHaveBeenCalledWith(USER_ID, CONV_ID);
  });

  it("남의 대화나 없는 대화는 404", async () => {
    mocks.deleteConversation.mockResolvedValue(false);

    const res = await item.DELETE(new Request(url, { method: "DELETE" }), ctx("not-an-id"));

    expect(res.status).toBe(404);
    expect(mocks.deleteConversation).toHaveBeenCalledWith(USER_ID, "not-an-id");
  });
});
