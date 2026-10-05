"use client";

import { useEffect } from "react";
import { AlertTriangle, RotateCw } from "lucide-react";
import { StatusScreen } from "@/components/status-screen";
import { Button } from "@/components/ui/button";

// (chat)/layout.tsx 자체가 실패한 경우(DB 연결 오류 등)를 포함해, 하위 경계에서 잡지 못한 오류를 받는다.
export default function RootError({
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
    <main className="flex flex-1 flex-col">
      <StatusScreen
        icon={<AlertTriangle />}
        title="문제가 발생했습니다"
        description={
          "서비스에 일시적인 문제가 있습니다. 잠시 후 다시 시도해 주세요." +
          (error.digest ? ` (오류 코드: ${error.digest})` : "")
        }
      >
        <Button onClick={() => retry()}>
          <RotateCw /> 다시 시도
        </Button>
      </StatusScreen>
    </main>
  );
}
