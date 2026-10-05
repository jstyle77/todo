import { Skeleton } from "@/components/ui/skeleton";

// 대화를 전환할 때 메시지 목록과 입력창 자리를 미리 보여준다. (MessageList, Chat과 같은 레이아웃)
export default function ConversationLoading() {
  return (
    <div className="flex min-h-0 flex-1 flex-col" role="status" aria-label="대화를 불러오는 중">
      <div className="min-h-0 flex-1 overflow-hidden">
        <div className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-6">
          <Skeleton className="h-10 w-2/5 self-end rounded-2xl" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-11/12" />
            <Skeleton className="h-4 w-3/4" />
          </div>
          <Skeleton className="h-10 w-1/3 self-end rounded-2xl" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
          </div>
        </div>
      </div>
      <div className="mx-auto w-full max-w-3xl px-4 pb-4">
        <Skeleton className="h-14 w-full rounded-2xl" />
      </div>
      <span className="sr-only">대화를 불러오는 중…</span>
    </div>
  );
}
