import Link from "next/link";
import { MessageSquareOff } from "lucide-react";
import { StatusScreen } from "@/components/status-screen";
import { buttonVariants } from "@/components/ui/button";

// 없는 대화와 다른 사용자의 대화를 구분하지 않는다 (존재 여부를 노출하지 않음).
export default function ConversationNotFound() {
  return (
    <StatusScreen
      icon={<MessageSquareOff />}
      title="대화를 찾을 수 없습니다"
      description="삭제되었거나 주소가 잘못된 대화입니다."
    >
      <Link href="/" className={buttonVariants()}>
        새 대화 시작
      </Link>
    </StatusScreen>
  );
}
