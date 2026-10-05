import "server-only";
import { ObjectId } from "mongodb";
import { getDb } from "@/lib/db";
import { toObjectId } from "@/lib/ids";
import type { ConversationDoc, ConversationSummary } from "@/types/chat";

// 모든 함수는 userId를 받아 조건에 포함한다. 다른 사용자의 대화에는 접근할 수 없다.

async function collection() {
  return (await getDb()).collection<ConversationDoc>("conversations");
}

function toSummary(doc: ConversationDoc): ConversationSummary {
  return {
    id: doc._id.toHexString(),
    title: doc.title,
    updatedAt: doc.updatedAt.toISOString(),
  };
}

export async function listConversations(userId: string): Promise<ConversationSummary[]> {
  const docs = await (await collection())
    .find({ userId: new ObjectId(userId) })
    .sort({ updatedAt: -1 })
    .limit(200)
    .toArray();
  return docs.map(toSummary);
}

export async function getConversation(
  userId: string,
  conversationId: string,
): Promise<ConversationSummary | null> {
  const _id = toObjectId(conversationId);
  if (!_id) return null;
  const doc = await (await collection()).findOne({ _id, userId: new ObjectId(userId) });
  return doc ? toSummary(doc) : null;
}

export async function createConversation(
  userId: string,
  title: string,
): Promise<ConversationSummary> {
  const now = new Date();
  const doc: ConversationDoc = {
    _id: new ObjectId(),
    userId: new ObjectId(userId),
    title,
    createdAt: now,
    updatedAt: now,
  };
  await (await collection()).insertOne(doc);
  return toSummary(doc);
}

export async function touchConversation(userId: string, conversationId: string): Promise<void> {
  const _id = toObjectId(conversationId);
  if (!_id) return;
  await (await collection()).updateOne(
    { _id, userId: new ObjectId(userId) },
    { $set: { updatedAt: new Date() } },
  );
}

export async function renameConversation(
  userId: string,
  conversationId: string,
  title: string,
): Promise<boolean> {
  const _id = toObjectId(conversationId);
  if (!_id) return false;
  const result = await (await collection()).updateOne(
    { _id, userId: new ObjectId(userId) },
    { $set: { title } },
  );
  return result.matchedCount === 1;
}

export async function deleteConversation(userId: string, conversationId: string): Promise<boolean> {
  const _id = toObjectId(conversationId);
  if (!_id) return false;
  const db = await getDb();
  const result = await db
    .collection<ConversationDoc>("conversations")
    .deleteOne({ _id, userId: new ObjectId(userId) });
  if (result.deletedCount === 1) {
    await db.collection("messages").deleteMany({ conversationId: _id, userId: new ObjectId(userId) });
    return true;
  }
  return false;
}
