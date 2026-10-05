import { redirect } from "next/navigation";
import { signInWithGitHub, signInWithGoogle } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { auth } from "@/lib/auth";

export default async function LoginPage() {
  const session = await auth();
  if (session?.user) redirect("/");

  return (
    <main className="flex flex-1 items-center justify-center p-6">
      <div className="w-full max-w-sm space-y-6 rounded-xl border p-8 shadow-sm">
        <div className="space-y-1 text-center">
          <h1 className="text-2xl font-semibold">AI Chat</h1>
          <p className="text-sm text-muted-foreground">계정으로 로그인해 대화를 시작하세요.</p>
        </div>
        <div className="space-y-2">
          <form action={signInWithGoogle}>
            <Button type="submit" variant="outline" size="lg" className="w-full">
              Google로 로그인
            </Button>
          </form>
          <form action={signInWithGitHub}>
            <Button type="submit" variant="outline" size="lg" className="w-full">
              GitHub로 로그인
            </Button>
          </form>
        </div>
      </div>
    </main>
  );
}
