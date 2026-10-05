"use client";

import { useState, type FormEvent, type KeyboardEvent } from "react";
import { ArrowUp, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

interface MessageInputProps {
  onSend: (text: string) => Promise<boolean>;
  onStop: () => void;
  streaming: boolean;
}

export function MessageInput({ onSend, onStop, streaming }: MessageInputProps) {
  const [text, setText] = useState("");

  async function submit(e?: FormEvent) {
    e?.preventDefault();
    const value = text.trim();
    if (!value || streaming) return;
    setText("");
    // 전송에 실패하면 입력한 내용을 되돌린다.
    if (!(await onSend(value))) setText(value);
  }

  function onKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    // Enter: 전송, Shift+Enter: 줄바꿈. 한글 조합 중에는 전송하지 않는다.
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      void submit();
    }
  }

  return (
    <form onSubmit={submit} className="flex items-end gap-2 rounded-2xl border bg-background p-2 shadow-sm">
      <Textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={onKeyDown}
        placeholder="메시지를 입력하세요 (Shift+Enter로 줄바꿈)"
        aria-label="메시지 입력"
        rows={1}
        className="max-h-48 min-h-10 resize-none border-0 shadow-none focus-visible:ring-0"
      />
      {streaming ? (
        <Button type="button" size="icon-lg" variant="secondary" onClick={onStop} aria-label="응답 중지">
          <Square />
        </Button>
      ) : (
        <Button type="submit" size="icon-lg" disabled={!text.trim()} aria-label="전송">
          <ArrowUp />
        </Button>
      )}
    </form>
  );
}
