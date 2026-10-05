"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { MessageInput } from "@/components/chat/message-input";
import { MessageList } from "@/components/chat/message-list";
import type { ChatMessage } from "@/types/chat";

interface ChatProps {
  conversationId?: string;
  initialMessages: ChatMessage[];
}

export function Chat({ conversationId, initialMessages }: ChatProps) {
  const router = useRouter();
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  // 화면을 떠나면 진행 중인 요청을 중단한다.
  useEffect(() => () => abortRef.current?.abort(), []);

  async function send(text: string): Promise<boolean> {
    setError(null);
    const userMessage: ChatMessage = { id: crypto.randomUUID(), role: "user", content: text };
    const assistantId = crypto.randomUUID();
    setMessages((prev) => [...prev, userMessage, { id: assistantId, role: "assistant", content: "" }]);
    setStreaming(true);

    const controller = new AbortController();
    abortRef.current = controller;
    let newConversationId: string | null = null;

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversationId, message: text }),
        signal: controller.signal,
      });

      if (!res.ok || !res.body) {
        const data = (await res.json().catch(() => null)) as { error?: string } | null;
        if (res.status === 401) router.push("/login");
        throw new Error(data?.error ?? "응답을 받지 못했습니다.");
      }

      if (!conversationId) newConversationId = res.headers.get("X-Conversation-Id");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        setMessages((prev) =>
          prev.map((m) => (m.id === assistantId ? { ...m, content: m.content + chunk } : m)),
        );
      }
      return true;
    } catch (err) {
      if (controller.signal.aborted) return true; // 사용자가 중지한 경우: 받은 내용은 그대로 둔다.
      // 실패하면 방금 추가한 두 메시지를 지우고 입력창에 내용을 돌려준다.
      setMessages((prev) => prev.filter((m) => m.id !== userMessage.id && m.id !== assistantId));
      setError(err instanceof Error ? err.message : "알 수 없는 오류가 발생했습니다.");
      return false;
    } finally {
      setStreaming(false);
      abortRef.current = null;
      // 새 대화면 대화 주소로 이동하고, 아니면 사이드바(정렬, 제목)만 새로 고친다.
      if (newConversationId) router.replace(`/c/${newConversationId}`);
      else router.refresh();
    }
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <MessageList messages={messages} streaming={streaming} />
      <div className="mx-auto w-full max-w-3xl px-4 pb-4">
        {error && (
          <p role="alert" className="mb-2 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        )}
        <MessageInput onSend={send} onStop={() => abortRef.current?.abort()} streaming={streaming} />
      </div>
    </div>
  );
}
