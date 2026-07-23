import { NextResponse } from "next/server";
import { getCardDraftByManageToken } from "@/lib/cards/repository";
import { previewGiftLink } from "@/lib/gift-polls/link-preview";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null) as { manageToken?: unknown; rawInput?: unknown } | null;
  if (!body || typeof body.manageToken !== "string" || typeof body.rawInput !== "string" || body.rawInput.length > 10_000) return NextResponse.json({ message: "Не удалось проверить ссылку." }, { status: 400 });
  if (!await getCardDraftByManageToken(body.manageToken)) return NextResponse.json({ message: "Ссылка управления больше не актуальна." }, { status: 403 });
  return NextResponse.json(await previewGiftLink(body.rawInput));
}
