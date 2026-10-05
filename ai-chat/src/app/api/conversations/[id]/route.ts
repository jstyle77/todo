import { getUserId } from "@/lib/auth";
import { renameRequestSchema } from "@/lib/chat";
import {
  deleteConversation,
  getConversation,
  renameConversation,
} from "@/lib/repositories/conversations";
import { listMessages } from "@/lib/repositories/messages";

type Context = { params: Promise<{ id: string }> };

const unauthorized = () => Response.json({ error: "로그인이 필요합니다." }, { status: 401 });
// 다른 사용자의 대화도 403이 아니라 404로 응답한다. (존재 여부를 노출하지 않음)
const notFound = () => Response.json({ error: "대화를 찾을 수 없습니다." }, { status: 404 });

export async function GET(_request: Request, { params }: Context) {
  const userId = await getUserId();
  if (!userId) return unauthorized();
  const { id } = await params;

  const conversation = await getConversation(userId, id);
  if (!conversation) return notFound();
  return Response.json({ conversation, messages: await listMessages(userId, id) });
}

export async function PATCH(request: Request, { params }: Context) {
  const userId = await getUserId();
  if (!userId) return unauthorized();
  const { id } = await params;

  const parsed = renameRequestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "제목이 올바르지 않습니다." }, { status: 400 });

  if (!(await renameConversation(userId, id, parsed.data.title))) return notFound();
  return Response.json({ ok: true });
}

export async function DELETE(_request: Request, { params }: Context) {
  const userId = await getUserId();
  if (!userId) return unauthorized();
  const { id } = await params;

  if (!(await deleteConversation(userId, id))) return notFound();
  return new Response(null, { status: 204 });
}
