import { NextResponse } from "next/server";
import { confirmRobokassaPayment } from "@/lib/payments/repository";
import { getRobokassaConfig, verifyRobokassaResult } from "@/lib/payments/robokassa";
import { getMerchantAccountById } from "@/lib/payments/merchant-accounts";

const fields = (params: URLSearchParams) => Object.fromEntries(params.entries());

export async function POST(request: Request) {
  const contentType = request.headers.get("content-type") ?? "";
  const values = contentType.includes("application/x-www-form-urlencoded")
    ? fields(new URLSearchParams(await request.text()))
    : fields(new URL(request.url).searchParams);
  const outSum = values.OutSum ?? "";
  const invId = values.InvId ?? values.InvID ?? "";
  const signatureValue = values.SignatureValue ?? "";
  const customParameters = Object.fromEntries(Object.entries(values).filter(([key]) => key.startsWith("Shp_")));

  try {
    const accountId = customParameters.Shp_account ?? "";
    const account = await getMerchantAccountById(accountId);
    if (!account || customParameters.Shp_order === undefined || !verifyRobokassaResult({ outSum, invId, signatureValue, customParameters }, getRobokassaConfig(account))) {
      return new NextResponse("bad signature", { status: 400 });
    }
    await confirmRobokassaPayment({ invoiceId: invId, merchantAccountId: account.id, outSum, payload: values });
    return new NextResponse(`OK${invId}`, { status: 200, headers: { "content-type": "text/plain; charset=utf-8" } });
  } catch {
    return new NextResponse("payment processing failed", { status: 500 });
  }
}
