import { NextResponse } from "next/server";
import { getCardLifecycleLabel } from "@/lib/cards/lifecycle";
import { getCardLifecycleByManageToken } from "@/lib/cards/lifecycle-repository";

export async function GET(_request: Request, { params }: { params: Promise<{ manageToken: string }> }) {
  const { manageToken } = await params;
  const card = await getCardLifecycleByManageToken(manageToken);

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
