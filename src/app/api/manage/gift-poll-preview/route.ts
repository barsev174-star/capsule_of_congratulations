import { NextResponse } from "next/server";
import { getCardDraftByManageToken } from "@/lib/cards/repository";
import { previewGiftLink } from "@/lib/gift-polls/link-preview";
import { requireCardManagementAccess } from "@/lib/manage/access";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null) as { manageToken?: unknown; rawInput?: unknown } | null;
  if (!body || typeof body.manageToken !== "string" || typeof body.rawInput !== "string" || body.rawInput.length > 10_000) return NextResponse.json({ message: "Не удалось проверить ссылку." }, { status: 400 });
  const card = await getCardDraftByManageToken(body.manageToken);
  if (!card) return NextResponse.json({ message: "Открытка не найдена." }, { status: 404 });
  try { await requireCardManagementAccess(card.id, { allowGuestDraft: true }); }
  catch { return NextResponse.json({ message: "Требуется вход владельца открытки." }, { status: 403 }); }
  return NextResponse.json(await previewGiftLink(body.rawInput));
}
