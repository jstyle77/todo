import { notFound, redirect } from "next/navigation";
import { Chat } from "@/components/chat/chat";
import { getUserId } from "@/lib/auth";
import { getConversation } from "@/lib/repositories/conversations";
import { listMessages } from "@/lib/repositories/messages";

export default async function ConversationPage({ params }: PageProps<"/c/[conversationId]">) {
  const userId = await getUserId();
  if (!userId) redirect("/login");

  const { conversationId } = await params;
  const conversation = await getConversation(userId, conversationId);
  if (!conversation) notFound();

  const messages = await listMessages(userId, conversationId);
  return <Chat key={conversationId} conversationId={conversationId} initialMessages={messages} />;
}
