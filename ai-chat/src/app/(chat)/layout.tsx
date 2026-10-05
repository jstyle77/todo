import { redirect } from "next/navigation";
import { ConversationList } from "@/components/sidebar/conversation-list";
import { auth } from "@/lib/auth";
import { listConversations } from "@/lib/repositories/conversations";

export default async function ChatLayout({ children }: LayoutProps<"/">) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) redirect("/login");

  const conversations = await listConversations(userId);

  return (
    <div className="flex h-full min-h-0 flex-1">
      <ConversationList
        conversations={conversations}
        userName={session.user?.name ?? session.user?.email ?? "사용자"}
      />
      <main className="flex min-w-0 flex-1 flex-col">{children}</main>
    </div>
  );
}
