import type { ObjectId } from "mongodb";

export type ChatRole = "user" | "assistant";

export interface ConversationDoc {
  _id: ObjectId;
  userId: ObjectId;
  title: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface MessageDoc {
  _id: ObjectId;
  conversationId: ObjectId;
  userId: ObjectId;
  role: ChatRole;
  content: string;
  createdAt: Date;
}

/** 클라이언트로 보내는 대화 요약 */
export interface ConversationSummary {
  id: string;
  title: string;
  updatedAt: string;
}

/** 클라이언트로 보내는 메시지 */
export interface ChatMessage {
  id: string;
  role: ChatRole;
  content: string;
}
