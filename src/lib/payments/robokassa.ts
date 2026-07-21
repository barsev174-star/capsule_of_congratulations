import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import type { MerchantAccount } from "@/lib/payments/merchant-accounts";

const checkoutUrl = "https://auth.robokassa.ru/Merchant/Index.aspx";

export type RobokassaConfig = {
  merchantLogin: string;
  password1: string;
  password2: string;
  isTest: boolean;
  hashAlgorithm: "md5" | "sha256";
};

export type RobokassaResult = {
  outSum: string;
  invId: string;
  signatureValue: string;
  customParameters: Record<string, string>;
};

const digest = (value: string, algorithm: "md5" | "sha256") => createHash(algorithm).update(value, "utf8").digest("hex");

const sortedCustomParameters = (parameters: Record<string, string>) =>
  Object.entries(parameters)
    .filter(([key]) => key.startsWith("Shp_"))
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => `${key}=${value}`);

const signature = (parts: string[], algorithm: "md5" | "sha256") => digest(parts.join(":"), algorithm).toLowerCase();

export const formatRobokassaAmount = (kopecks: number) => {
  if (!Number.isInteger(kopecks) || kopecks < 1) {
    throw new Error("Payment amount must be a positive integer number of kopecks.");
  }
  return (kopecks / 100).toFixed(2);
};

export const getRobokassaMode = (): "test" | "live" => process.env.ROBOKASSA_MODE === "live" ? "live" : "test";

export const getRobokassaConfig = (account: Pick<MerchantAccount, "merchantLogin">): RobokassaConfig => {
  const mode = getRobokassaMode();
  const password1 = mode === "test" ? process.env.ROBOKASSA_TEST_PASSWORD_1 : process.env.ROBOKASSA_LIVE_PASSWORD_1;
  const password2 = mode === "test" ? process.env.ROBOKASSA_TEST_PASSWORD_2 : process.env.ROBOKASSA_LIVE_PASSWORD_2;
  const hashAlgorithm = process.env.ROBOKASSA_HASH_ALGORITHM === "MD5" ? "md5" : "sha256";

  if (!account.merchantLogin || !password1 || !password2) {
    throw new Error("Robokassa is not configured.");
  }

  return {
    merchantLogin: account.merchantLogin,
    password1,
    password2,
    isTest: mode === "test",
    hashAlgorithm
  };
};

const base64Url = (value: string | Buffer) => Buffer.from(value).toString("base64url");

export const createRobokassaRefundJwt = (opKey: string, password3: string, refundSum?: number) => {
  const payload: Record<string, string | number> = { OpKey: opKey };
  if (refundSum !== undefined) payload.RefundSum = refundSum;
  const encodedHeader = base64Url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const encodedPayload = base64Url(JSON.stringify(payload));
  const signingInput = `${encodedHeader}.${encodedPayload}`;
  return `${signingInput}.${createHmac("sha256", password3).update(signingInput).digest("base64url")}`;
};

const xmlValue = (xml: string, tag: string) => xml.match(new RegExp(`<${tag}>([^<]+)</${tag}>`, "i"))?.[1] ?? null;

export const getRobokassaOperationKey = async (input: { config: RobokassaConfig; invoiceId: string }) => {
  if (input.config.isTest) throw new Error("Robokassa OpStateExt is unavailable in test mode.");
  const signatureValue = digest(`${input.config.merchantLogin}:${input.invoiceId}:${input.config.password2}`, input.config.hashAlgorithm);
  const params = new URLSearchParams({ MerchantLogin: input.config.merchantLogin, InvoiceID: input.invoiceId, Signature: signatureValue });
  const response = await fetch(`https://auth.robokassa.ru/Merchant/WebService/Service.asmx/OpStateExt?${params.toString()}`, { cache: "no-store" });
  const xml = await response.text();
  if (!response.ok || xmlValue(xml, "Code") !== "0" || xmlValue(xml, "State")?.match(/<Code>100<\/Code>/)) {
    throw new Error("Robokassa operation lookup failed.");
  }
  const opKey = xmlValue(xml, "OpKey");
  if (!opKey) throw new Error("Robokassa operation key is unavailable.");
  return opKey;
};

export const createRobokassaRefund = async (input: { opKey: string; refundSum?: number }) => {
  const password3 = getRobokassaMode() === "test" ? process.env.ROBOKASSA_TEST_PASSWORD_3 : process.env.ROBOKASSA_LIVE_PASSWORD_3;
  if (!password3) throw new Error("Robokassa refunds are not configured.");
  const response = await fetch("https://services.robokassa.ru/RefundService/Refund/Create", {
    method: "POST",
    headers: { "content-type": "text/plain; charset=utf-8" },
    body: createRobokassaRefundJwt(input.opKey, password3, input.refundSum)
  });
  const body = await response.json() as { success?: boolean; requestId?: string | null; message?: string | null };
  if (!response.ok || !body.success || !body.requestId) throw new Error(body.message ?? "Robokassa refund request failed.");
  return body.requestId;
};

export const getRobokassaRefundState = async (requestId: string) => {
  const response = await fetch(`https://services.robokassa.ru/RefundService/Refund/GetState?id=${encodeURIComponent(requestId)}`, { cache: "no-store" });
  const body = await response.json() as { requestId?: string; amount?: number; label?: "finished" | "processing" | "canceled"; message?: string };
  if (!response.ok || !body.label) throw new Error(body.message ?? "Robokassa refund state is unavailable.");
  return body;
};

export const buildRobokassaCheckoutUrl = (input: {
  config: RobokassaConfig;
  amount: number;
  invoiceId: string;
  description: string;
  receipt: string;
  customParameters: Record<string, string>;
  successUrl: string;
  failUrl: string;
}) => {
  const outSum = formatRobokassaAmount(input.amount);
  const receipt = encodeURIComponent(input.receipt);
  const custom = sortedCustomParameters(input.customParameters);
  const signatureValue = signature([
    input.config.merchantLogin,
    outSum,
    input.invoiceId,
    receipt,
    input.config.password1,
    ...custom
  ], input.config.hashAlgorithm);
  const params = new URLSearchParams({
    MerchantLogin: input.config.merchantLogin,
    OutSum: outSum,
    InvId: input.invoiceId,
    Description: input.description,
    Receipt: receipt,
    SignatureValue: signatureValue,
    SuccessUrl2: input.successUrl,
    SuccessUrl2Method: "GET",
    FailUrl2: input.failUrl,
    FailUrl2Method: "GET",
    Culture: "ru"
  });

  if (input.config.isTest) params.set("IsTest", "1");
  for (const [key, value] of Object.entries(input.customParameters)) {
    if (key.startsWith("Shp_")) params.set(key, value);
  }

  return `${checkoutUrl}?${params.toString()}`;
};

export const verifyRobokassaResult = (result: RobokassaResult, config: RobokassaConfig) => {
  if (!/^\d+(?:\.\d+)?$/.test(result.outSum) || !/^\d+$/.test(result.invId) || !/^[a-fA-F0-9]{32}$/.test(result.signatureValue)) {
    return false;
  }
  const expected = signature([result.outSum, result.invId, config.password2, ...sortedCustomParameters(result.customParameters)], config.hashAlgorithm);
  const received = result.signatureValue.toLowerCase();
  return timingSafeEqual(Buffer.from(expected), Buffer.from(received));
};
