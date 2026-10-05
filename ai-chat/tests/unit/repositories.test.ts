import { MongoClient, ObjectId, type Db } from "mongodb";
import { MongoMemoryServer } from "mongodb-memory-server";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

// 실제 MongoDB(메모리 서버)에 대해 repository 함수를 실행한다.
let db: Db;
vi.mock("@/lib/db", () => ({ getDb: async () => db }));

const {
  createConversation,
  deleteConversation,
  getConversation,
  listConversations,
  renameConversation,
  touchConversation,
} = await import("@/lib/repositories/conversations");
const { addMessage, listMessages } = await import("@/lib/repositories/messages");

let server: MongoMemoryServer;
let client: MongoClient;

beforeAll(async () => {
  server = await MongoMemoryServer.create();
  client = await MongoClient.connect(server.getUri());
  db = client.db("test");
});

afterAll(async () => {
  await client?.close();
  await server?.stop();
});

beforeEach(async () => {
  await db.dropDatabase();
});

const alice = new ObjectId().toHexString();
const bob = new ObjectId().toHexString();

describe("conversations repository", () => {
  it("대화를 만들고 최근 수정 순으로 목록을 돌려준다", async () => {
    const first = await createConversation(alice, "첫 대화");
    const second = await createConversation(alice, "둘째 대화");
    await new Promise((r) => setTimeout(r, 5));
    await touchConversation(alice, first.id);

    const list = await listConversations(alice);
    expect(list.map((c) => c.id)).toEqual([first.id, second.id]);
  });

  it("다른 사용자의 대화는 목록과 조회에 나오지 않는다", async () => {
    const conv = await createConversation(alice, "앨리스의 대화");

    expect(await listConversations(bob)).toEqual([]);
    expect(await getConversation(bob, conv.id)).toBeNull();
    expect(await getConversation(alice, conv.id)).toMatchObject({ id: conv.id, title: "앨리스의 대화" });
  });

  it("다른 사용자는 제목을 바꿀 수 없다", async () => {
    const conv = await createConversation(alice, "원래 제목");

    expect(await renameConversation(bob, conv.id, "탈취")).toBe(false);
    expect((await getConversation(alice, conv.id))?.title).toBe("원래 제목");

    expect(await renameConversation(alice, conv.id, "새 제목")).toBe(true);
    expect((await getConversation(alice, conv.id))?.title).toBe("새 제목");
  });

  it("다른 사용자는 updatedAt을 바꿀 수 없다", async () => {
    const conv = await createConversation(alice, "대화");
    await new Promise((r) => setTimeout(r, 5));
    await touchConversation(bob, conv.id);
    expect((await getConversation(alice, conv.id))?.updatedAt).toBe(conv.updatedAt);
  });

  it("다른 사용자는 대화를 삭제할 수 없고, 메시지도 남는다", async () => {
    const conv = await createConversation(alice, "대화");
    await addMessage(alice, conv.id, "user", "안녕");

    expect(await deleteConversation(bob, conv.id)).toBe(false);
    expect(await getConversation(alice, conv.id)).not.toBeNull();
    expect(await listMessages(alice, conv.id)).toHaveLength(1);
  });

  it("삭제하면 그 대화의 메시지만 지운다", async () => {
    const target = await createConversation(alice, "지울 대화");
    const other = await createConversation(alice, "남길 대화");
    await addMessage(alice, target.id, "user", "지워질 메시지");
    await addMessage(alice, other.id, "user", "남을 메시지");

    expect(await deleteConversation(alice, target.id)).toBe(true);
    expect(await getConversation(alice, target.id)).toBeNull();
    expect(await listMessages(alice, target.id)).toEqual([]);
    expect(await listMessages(alice, other.id)).toHaveLength(1);
  });

  it("잘못된 ID 형식은 오류 없이 '없음'으로 처리한다", async () => {
    expect(await getConversation(alice, "not-an-id")).toBeNull();
    expect(await renameConversation(alice, "not-an-id", "제목")).toBe(false);
    expect(await deleteConversation(alice, "not-an-id")).toBe(false);
  });
});

describe("messages repository", () => {
  it("메시지를 저장한 순서대로 돌려준다", async () => {
    const conv = await createConversation(alice, "대화");
    await addMessage(alice, conv.id, "user", "질문");
    await addMessage(alice, conv.id, "assistant", "답변");
    await addMessage(alice, conv.id, "user", "다음 질문");

    const messages = await listMessages(alice, conv.id);
    expect(messages.map((m) => [m.role, m.content])).toEqual([
      ["user", "질문"],
      ["assistant", "답변"],
      ["user", "다음 질문"],
    ]);
  });

  it("대화 ID를 알아도 다른 사용자는 메시지를 읽을 수 없다", async () => {
    const conv = await createConversation(alice, "대화");
    await addMessage(alice, conv.id, "user", "비밀");

    expect(await listMessages(bob, conv.id)).toEqual([]);
  });

  it("잘못된 대화 ID로는 메시지를 저장하지 않는다", async () => {
    await expect(addMessage(alice, "not-an-id", "user", "x")).rejects.toThrow();
    expect(await listMessages(alice, "not-an-id")).toEqual([]);
  });
});
