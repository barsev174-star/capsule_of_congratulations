import { NextResponse } from "next/server";
import { requireAdminRole } from "@/lib/admin/session";
import { accessGrantReasons, grantCardAccess } from "@/lib/cards/access-grants";
import { CardLifecycleConflictError } from "@/lib/cards/lifecycle";

export async function POST(request: Request, { params }: { params: Promise<{ cardId: string }> }) {
  try {
    const session = await requireAdminRole("admin");
    const { cardId } = await params;
    const body = await request.json() as { reasonCode?: string; comment?: string; duration?: { type?: string; expiresAt?: string } };
    const reasonCode = body.reasonCode;
    const comment = body.comment?.trim() ?? "";
    if (!reasonCode || !accessGrantReasons.includes(reasonCode as typeof accessGrantReasons[number]) || comment.length < 3 || comment.length > 1000) {
      return NextResponse.json({ ok: false, message: "Проверьте причину и комментарий." }, { status: 400 });
    }
    const expiresAt = body.duration?.type === "PERMANENT" ? null : body.duration?.type === "UNTIL_DATE" ? body.duration.expiresAt ?? null : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    if (expiresAt && Number.isNaN(Date.parse(expiresAt))) return NextResponse.json({ ok: false, message: "Укажите корректный срок доступа." }, { status: 400 });
    const grantId = await grantCardAccess({ cardId, adminEmail: session.email, reasonCode: reasonCode as typeof accessGrantReasons[number], comment, expiresAt });
    return NextResponse.json({ ok: true, grantId });
  } catch (error) {
    if (error instanceof CardLifecycleConflictError) return NextResponse.json({ ok: false, message: error.message }, { status: 409 });
    if (error instanceof Error && ["Unauthorized", "Forbidden"].includes(error.message)) return NextResponse.json({ ok: false }, { status: 403 });
    throw error;
  }
}
