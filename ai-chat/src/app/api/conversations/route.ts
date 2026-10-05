import { getUserId } from "@/lib/auth";
import { createConversation, listConversations } from "@/lib/repositories/conversations";

export async function GET() {
  const userId = await getUserId();
  if (!userId) return Response.json({ error: "로그인이 필요합니다." }, { status: 401 });
  return Response.json({ conversations: await listConversations(userId) });
}

export async function POST() {
  const userId = await getUserId();
  if (!userId) return Response.json({ error: "로그인이 필요합니다." }, { status: 401 });
  return Response.json({ conversation: await createConversation(userId, "새 대화") }, { status: 201 });
}
