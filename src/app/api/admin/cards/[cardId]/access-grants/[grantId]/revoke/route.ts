import { NextResponse } from "next/server";
import { requireAdminRole } from "@/lib/admin/session";
import { revokeCardAccess } from "@/lib/cards/access-grants";
import { CardLifecycleConflictError } from "@/lib/cards/lifecycle";

export async function POST(request: Request, { params }: { params: Promise<{ cardId: string; grantId: string }> }) {
  try {
    const session = await requireAdminRole("admin");
    const { cardId, grantId } = await params;
    const body = await request.json() as { comment?: string };
    const comment = body.comment?.trim() ?? "";
    if (comment.length < 3 || comment.length > 1000) return NextResponse.json({ ok: false, message: "Укажите комментарий к отзыву." }, { status: 400 });
    await revokeCardAccess({ cardId, grantId, adminEmail: session.email, comment });
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof CardLifecycleConflictError) return NextResponse.json({ ok: false, message: error.message }, { status: 409 });
    if (error instanceof Error && ["Unauthorized", "Forbidden"].includes(error.message)) return NextResponse.json({ ok: false }, { status: 403 });
    throw error;
  }
}
