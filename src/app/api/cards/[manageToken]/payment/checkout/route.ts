import { NextResponse } from "next/server";
import { CardLifecycleConflictError } from "@/lib/cards/lifecycle";
import { createRobokassaCheckout } from "@/lib/payments/repository";
import { buildRobokassaCheckoutUrl, getRobokassaConfig } from "@/lib/payments/robokassa";

const siteUrl = () => process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ?? "";

export async function POST(request: Request, { params }: { params: Promise<{ manageToken: string }> }) {
  try {
    const { manageToken } = await params;
    const body = await request.json().catch(() => null) as { receiptEmail?: string; offerAccepted?: boolean; privacyAccepted?: boolean } | null;
    const receiptEmail = body?.receiptEmail?.trim().toLowerCase() ?? "";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(receiptEmail)) return NextResponse.json({ ok: false, message: "Укажите email для чека." }, { status: 400 });
    if (!body?.offerAccepted || !body?.privacyAccepted) return NextResponse.json({ ok: false, message: "Подтвердите принятие документов перед оплатой." }, { status: 400 });
    const baseUrl = siteUrl();
    if (!baseUrl) throw new Error("NEXT_PUBLIC_SITE_URL is not configured.");
    const checkout = await createRobokassaCheckout({
      manageToken,
      receiptEmail,
      offerAccepted: body.offerAccepted,
      privacyAccepted: body.privacyAccepted,
      buildUrl: async (invoiceId, orderId, merchantAccountId, receipt) => {
        const account = await (await import("@/lib/payments/merchant-accounts")).getMerchantAccountById(merchantAccountId);
        if (!account) throw new Error("Merchant account is unavailable.");
        return buildRobokassaCheckoutUrl({
        config: getRobokassaConfig(account),
        amount: 39900,
        invoiceId,
        description: "Финальная открытка Slovesto",
        receipt,
        customParameters: { Shp_order: orderId, Shp_account: merchantAccountId },
        successUrl: process.env.ROBOKASSA_SUCCESS_URL ?? `${baseUrl}/payment/success`,
        failUrl: process.env.ROBOKASSA_FAIL_URL ?? `${baseUrl}/payment/fail`
      }); }
    });
    return NextResponse.json({ ok: true, checkout });
  } catch (error) {
    if (error instanceof CardLifecycleConflictError) return NextResponse.json({ ok: false, message: error.message }, { status: 409 });
    if (error instanceof Error && error.message.includes("not configured")) return NextResponse.json({ ok: false, message: "Оплата пока не настроена." }, { status: 503 });
    throw error;
  }
}
