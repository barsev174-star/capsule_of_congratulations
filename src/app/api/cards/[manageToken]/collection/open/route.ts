import { NextResponse } from "next/server";
import { CardLifecycleConflictError } from "@/lib/cards/lifecycle";
import { openCollection } from "@/lib/cards/lifecycle-repository";

export async function POST(_request: Request, { params }: { params: Promise<{ manageToken: string }> }) {
  try {
    const { manageToken } = await params;
    const card = await openCollection(manageToken);
    return NextResponse.json({ ok: true, card });
  } catch (error) {
    if (error instanceof CardLifecycleConflictError) {
      return NextResponse.json({ ok: false, message: error.message }, { status: 409 });
    }
    throw error;
  }
}
