import { NextResponse } from "next/server";
import { CardLifecycleConflictError } from "@/lib/cards/lifecycle";
import { deliverCard } from "@/lib/cards/lifecycle-repository";

export async function POST(request: Request, { params }: { params: Promise<{ manageToken: string }> }) {
  try {
    const { manageToken } = await params;
    const body = await request.json().catch(() => ({})) as { confirmed?: unknown; cardVersion?: unknown };
    const card = await deliverCard(manageToken, {
      confirmed: body.confirmed === true,
      cardVersion: typeof body.cardVersion === "string" ? body.cardVersion : ""
    });
    return NextResponse.json({ ok: true, card });
  } catch (error) {
    if (error instanceof CardLifecycleConflictError) {
      return NextResponse.json({ ok: false, message: error.message }, { status: 409 });
    }
    throw error;
  }
}
