import "server-only";
import { ObjectId } from "mongodb";
import { getDb } from "@/lib/db";
import { toObjectId } from "@/lib/ids";
import type { ChatMessage, ChatRole, MessageDoc } from "@/types/chat";

// 호출하기 전에 대화의 소유자가 userId인지 conversations 쪽에서 확인해야 한다.
// 여기서도 userId 조건을 함께 걸어 이중으로 막는다.

async function collection() {
  return (await getDb()).collection<MessageDoc>("messages");
}

export async function listMessages(userId: string, conversationId: string): Promise<ChatMessage[]> {
  const _id = toObjectId(conversationId);
  if (!_id) return [];
  const docs = await (await collection())
    .find({ conversationId: _id, userId: new ObjectId(userId) })
    .sort({ createdAt: 1, _id: 1 })
    .toArray();
  return docs.map((d) => ({ id: d._id.toHexString(), role: d.role, content: d.content }));
}

export async function addMessage(
  userId: string,
  conversationId: string,
  role: ChatRole,
  content: string,
): Promise<void> {
  const _id = toObjectId(conversationId);
  if (!_id) throw new Error("잘못된 대화 ID");
  await (await collection()).insertOne({
    _id: new ObjectId(),
    conversationId: _id,
    userId: new ObjectId(userId),
    role,
    content,
    createdAt: new Date(),
  });
}
