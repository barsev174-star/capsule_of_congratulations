import { NextResponse } from "next/server";
import { getCardLifecycleLabel } from "@/lib/cards/lifecycle";
import { getCardLifecycleByManageToken } from "@/lib/cards/lifecycle-repository";
import { getCardDraftByManageToken } from "@/lib/cards/repository";
import { requireCardManagementAccess } from "@/lib/manage/access";

export async function GET(_request: Request, { params }: { params: Promise<{ manageToken: string }> }) {
  const { manageToken } = await params;
  const draft = await getCardDraftByManageToken(manageToken);
  if (!draft) return NextResponse.json({ ok: false, message: "Открытка не найдена." }, { status: 404 });
  try { await requireCardManagementAccess(draft.id, { allowGuestDraft: true }); }
  catch { return NextResponse.json({ ok: false, message: "Требуется вход владельца открытки." }, { status: 403 }); }
  const card = await getCardLifecycleByManageToken(draft.id);

  if (!card || card.purgedAt !== null) {
    return NextResponse.json({ ok: false, message: "Открытка не найдена." }, { status: 404 });
  }

  return NextResponse.json({
    ok: true,
    status: {
      paymentStatus: card.paymentStatus,
      collectionStatus: card.collectionStatus,
      deliveryStatus: card.deliveryStatus,
      label: getCardLifecycleLabel(card)
    }
  });
}
