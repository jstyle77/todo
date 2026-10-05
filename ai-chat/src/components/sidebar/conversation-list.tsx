"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Check, LogOut, Pencil, Plus, Trash2, X } from "lucide-react";
import { signOutAction } from "@/app/actions";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { ConversationSummary } from "@/types/chat";

interface ConversationListProps {
  conversations: ConversationSummary[];
  userName: string;
}

export function ConversationList({ conversations, userName }: ConversationListProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");

  async function rename(e: FormEvent, id: string) {
    e.preventDefault();
    const title = draft.trim();
    setEditingId(null);
    if (!title) return;
    const res = await fetch(`/api/conversations/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title }),
    });
    if (!res.ok) alert("제목을 바꾸지 못했습니다.");
    router.refresh();
  }

  async function remove(id: string, title: string) {
    if (!confirm(`"${title}" 대화를 삭제할까요?`)) return;
    const res = await fetch(`/api/conversations/${id}`, { method: "DELETE" });
    if (!res.ok) {
      alert("대화를 삭제하지 못했습니다.");
      return;
    }
    if (pathname === `/c/${id}`) router.push("/");
    router.refresh();
  }

  return (
    <aside className="flex w-64 shrink-0 flex-col border-r bg-sidebar text-sidebar-foreground">
      <div className="p-3">
        <Link href="/" className={cn(buttonVariants({ variant: "outline" }), "w-full justify-start")}>
          <Plus /> 새 대화
        </Link>
      </div>

      <nav className="min-h-0 flex-1 overflow-y-auto px-2" aria-label="대화 목록">
        {conversations.length === 0 && (
          <p className="px-2 py-4 text-sm text-muted-foreground">아직 대화가 없습니다.</p>
        )}
        <ul className="space-y-0.5">
          {conversations.map((c) => {
            const active = pathname === `/c/${c.id}`;
            if (editingId === c.id) {
              return (
                <li key={c.id}>
                  <form onSubmit={(e) => rename(e, c.id)} className="flex items-center gap-1 py-0.5">
                    <Input
                      value={draft}
                      onChange={(e) => setDraft(e.target.value)}
                      onKeyDown={(e) => e.key === "Escape" && setEditingId(null)}
                      aria-label="대화 제목"
                      maxLength={100}
                      autoFocus
                    />
                    <Button type="submit" size="icon-sm" variant="ghost" aria-label="저장">
                      <Check />
                    </Button>
                    <Button type="button" size="icon-sm" variant="ghost" aria-label="취소" onClick={() => setEditingId(null)}>
                      <X />
                    </Button>
                  </form>
                </li>
              );
            }
            return (
              <li key={c.id} className="group relative">
                <Link
                  href={`/c/${c.id}`}
                  className={cn(
                    "block truncate rounded-md px-2 py-1.5 pr-14 text-sm hover:bg-sidebar-accent",
                    active && "bg-sidebar-accent font-medium",
                  )}
                  title={c.title}
                >
                  {c.title}
                </Link>
                <div className="absolute inset-y-0 right-1 hidden items-center group-hover:flex group-focus-within:flex">
                  <Button
                    size="icon-xs"
                    variant="ghost"
                    aria-label="제목 변경"
                    onClick={() => {
                      setDraft(c.title);
                      setEditingId(c.id);
                    }}
                  >
                    <Pencil />
                  </Button>
                  <Button size="icon-xs" variant="ghost" aria-label="삭제" onClick={() => remove(c.id, c.title)}>
                    <Trash2 />
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="flex items-center justify-between gap-2 border-t p-3">
        <span className="truncate text-sm" title={userName}>
          {userName}
        </span>
        <form action={signOutAction}>
          <Button type="submit" size="icon-sm" variant="ghost" aria-label="로그아웃">
            <LogOut />
          </Button>
        </form>
      </div>
    </aside>
  );
}
