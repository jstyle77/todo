"use client";

import { useEffect, useRef } from "react";
import { Markdown } from "@/components/chat/markdown";
import type { ChatMessage } from "@/types/chat";

interface MessageListProps {
  messages: ChatMessage[];
  streaming: boolean;
}

export function MessageList({ messages, streaming }: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [messages]);

  if (messages.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center p-6 text-center">
        <div className="space-y-2">
          <h2 className="text-2xl font-semibold">무엇을 도와드릴까요?</h2>
          <p className="text-sm text-muted-foreground">아래에 메시지를 입력해 대화를 시작하세요.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-0 flex-1 overflow-y-auto">
      <div className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-6">
        {messages.map((m, i) => {
          const isLastAssistant = m.role === "assistant" && i === messages.length - 1;
          if (m.role === "user") {
            return (
              <div key={m.id} className="self-end max-w-[85%] rounded-2xl bg-muted px-4 py-2.5 whitespace-pre-wrap break-words">
                {m.content}
              </div>
            );
          }
          return (
            <div key={m.id} className="min-w-0">
              {m.content ? (
                <Markdown content={m.content} />
              ) : (
                isLastAssistant && streaming && (
                  <span className="text-sm text-muted-foreground animate-pulse">생각하는 중…</span>
                )
              )}
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
