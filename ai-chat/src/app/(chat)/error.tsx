"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, RotateCw } from "lucide-react";
import { StatusScreen } from "@/components/status-screen";
import { Button, buttonVariants } from "@/components/ui/button";

// 대화 화면에서 난 오류. 사이드바((chat)/layout.tsx)는 그대로 두고 본문만 바꾼다.
export default function ChatError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <StatusScreen
      icon={<AlertTriangle />}
      title="대화를 불러오지 못했습니다"
      description={
        "일시적인 문제일 수 있습니다. 잠시 후 다시 시도해 주세요." +
        (error.digest ? ` (오류 코드: ${error.digest})` : "")
      }
    >
      <Button onClick={() => retry()}>
        <RotateCw /> 다시 시도
      </Button>
      <Link href="/" className={buttonVariants({ variant: "outline" })}>
        새 대화
      </Link>
    </StatusScreen>
  );
}
