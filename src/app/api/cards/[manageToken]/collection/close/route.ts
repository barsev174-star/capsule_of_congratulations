import { NextResponse } from "next/server";
import { CardLifecycleConflictError } from "@/lib/cards/lifecycle";
import { closeCollection } from "@/lib/cards/lifecycle-repository";
import { getCardDraftByManageToken } from "@/lib/cards/repository";
import { CardManagementAccessError, requireCardManagementAccess } from "@/lib/manage/access";

export async function POST(_request: Request, { params }: { params: Promise<{ manageToken: string }> }) {
  try {
    const { manageToken } = await params;
    const draft = await getCardDraftByManageToken(manageToken);
    if (!draft) return NextResponse.json({ ok: false, message: "Открытка не найдена." }, { status: 404 });
    await requireCardManagementAccess(draft.id);
    const card = await closeCollection(draft.id);
    return NextResponse.json({ ok: true, card });
  } catch (error) {
    if (error instanceof CardManagementAccessError) {
      return NextResponse.json({ ok: false, message: "Требуется вход владельца открытки." }, { status: 403 });
    }
    if (error instanceof CardLifecycleConflictError) {
      return NextResponse.json({ ok: false, message: error.message }, { status: 409 });
    }
    throw error;
  }
}
