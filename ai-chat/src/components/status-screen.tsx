import type { ReactNode } from "react";

interface StatusScreenProps {
  icon: ReactNode;
  title: string;
  description: string;
  /** 버튼이나 링크 */
  children?: ReactNode;
}

/** 오류, 404처럼 본문 대신 안내 문구를 보여주는 화면 */
export function StatusScreen({ icon, title, description, children }: StatusScreenProps) {
  return (
    <div className="flex flex-1 items-center justify-center p-6">
      <div className="flex max-w-sm flex-col items-center gap-4 text-center">
        <div className="rounded-full bg-muted p-3 text-muted-foreground [&_svg]:size-6">{icon}</div>
        <div className="space-y-1">
          <h2 className="text-xl font-semibold">{title}</h2>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
        {children && <div className="flex flex-wrap justify-center gap-2">{children}</div>}
      </div>
    </div>
  );
}
