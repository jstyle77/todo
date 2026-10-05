import Link from "next/link";
import { FileQuestion } from "lucide-react";
import { StatusScreen } from "@/components/status-screen";
import { buttonVariants } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="flex flex-1 flex-col">
      <StatusScreen
        icon={<FileQuestion />}
        title="페이지를 찾을 수 없습니다"
        description="주소가 잘못되었거나 더 이상 없는 페이지입니다."
      >
        <Link href="/" className={buttonVariants()}>
          처음으로
        </Link>
      </StatusScreen>
    </main>
  );
}
