import { createHash, createHmac } from "node:crypto";

export type EmailProvider = "postbox" | "resend";

export type TransactionalEmail = {
  to: string | string[];
  from?: string;
  replyTo?: string;
  subject: string;
  html: string;
  text: string;
  idempotencyKey?: string;
};

const sha256 = (value: string) => createHash("sha256").update(value, "utf8").digest("hex");
const hmac = (key: Buffer | string, value: string) => createHmac("sha256", key).update(value, "utf8").digest();

export const getConfiguredEmailProvider = (): EmailProvider | null => {
  const configured = process.env.EMAIL_PROVIDER?.trim().toLowerCase();
  if (process.env.PRODUCTION_PROVIDER_POLICY?.trim() === "russian-only" && configured !== "postbox") {
    throw new Error("Only Yandex Cloud Postbox is allowed by the production provider policy");
  }
  if (configured === "postbox" || configured === "resend") return configured;
  if (configured) throw new Error(`Unsupported email provider: ${configured}`);
  if (process.env.YANDEX_POSTBOX_ACCESS_KEY_ID?.trim() && process.env.YANDEX_POSTBOX_SECRET_ACCESS_KEY?.trim()) return "postbox";
  if (process.env.RESEND_API_KEY?.trim()) return "resend";
  return null;
};

export const hasConfiguredEmailTransport = () => Boolean(
  process.env.EMAIL_FROM?.trim() && getConfiguredEmailProvider()
);

const getPostboxAuthorization = (input: {
  accessKeyId: string;
  secretAccessKey: string;
  region: string;
  host: string;
  path: string;
  body: string;
  now: Date;
}) => {
  const amzDate = input.now.toISOString().replace(/[:-]|\.\d{3}/g, "");
  const dateStamp = amzDate.slice(0, 8);
  const payloadHash = sha256(input.body);
  const signedHeaders = "content-type;host;x-amz-content-sha256;x-amz-date";
  const canonicalHeaders = [
    "content-type:application/json",
    `host:${input.host}`,
    `x-amz-content-sha256:${payloadHash}`,
    `x-amz-date:${amzDate}`
  ].join("\n") + "\n";
  const canonicalRequest = [
    "POST",
    input.path,
    "",
    canonicalHeaders,
    signedHeaders,
    payloadHash
  ].join("\n");
  const scope = `${dateStamp}/${input.region}/ses/aws4_request`;
  const stringToSign = [
    "AWS4-HMAC-SHA256",
    amzDate,
    scope,
    sha256(canonicalRequest)
  ].join("\n");
  const dateKey = hmac(`AWS4${input.secretAccessKey}`, dateStamp);
  const regionKey = hmac(dateKey, input.region);
  const serviceKey = hmac(regionKey, "ses");
  const signingKey = hmac(serviceKey, "aws4_request");
  const signature = createHmac("sha256", signingKey).update(stringToSign, "utf8").digest("hex");

  return {
    amzDate,
    payloadHash,
    authorization: `AWS4-HMAC-SHA256 Credential=${input.accessKeyId}/${scope}, SignedHeaders=${signedHeaders}, Signature=${signature}`
  };
};

const sendWithPostbox = async (input: Required<Pick<TransactionalEmail, "from">> & TransactionalEmail) => {
  const accessKeyId = process.env.YANDEX_POSTBOX_ACCESS_KEY_ID?.trim();
  const secretAccessKey = process.env.YANDEX_POSTBOX_SECRET_ACCESS_KEY?.trim();
  if (!accessKeyId || !secretAccessKey) throw new Error("Yandex Cloud Postbox credentials are not configured");

  const endpoint = new URL(process.env.YANDEX_POSTBOX_ENDPOINT?.trim() || "https://postbox.cloud.yandex.net");
  if (endpoint.protocol !== "https:") throw new Error("Yandex Cloud Postbox endpoint must use HTTPS");
  const path = "/v2/email/outbound-emails";
  const body = JSON.stringify({
    FromEmailAddress: input.from,
    Destination: { ToAddresses: Array.isArray(input.to) ? input.to : [input.to] },
    ...(input.replyTo ? { ReplyToAddresses: [input.replyTo] } : {}),
    Content: {
      Simple: {
        Subject: { Data: input.subject, Charset: "UTF-8" },
        Body: {
          Html: { Data: input.html, Charset: "UTF-8" },
          Text: { Data: input.text, Charset: "UTF-8" }
        }
      }
    }
  });
  const signing = getPostboxAuthorization({
    accessKeyId,
    secretAccessKey,
    region: process.env.YANDEX_POSTBOX_REGION?.trim() || "ru-central1",
    host: endpoint.host,
    path,
    body,
    now: new Date()
  });
  const response = await fetch(new URL(path, endpoint), {
    method: "POST",
    signal: AbortSignal.timeout(Math.max(1_000, Number(process.env.EMAIL_TIMEOUT_MS ?? 15_000) || 15_000)),
    headers: {
      Authorization: signing.authorization,
      "Content-Type": "application/json",
      "User-Agent": "slovesto/1.0",
      "X-Amz-Content-Sha256": signing.payloadHash,
      "X-Amz-Date": signing.amzDate
    },
    body
  });
  if (!response.ok) throw new Error(`Yandex Cloud Postbox returned HTTP ${response.status}`);
};

const sendWithResend = async (input: Required<Pick<TransactionalEmail, "from">> & TransactionalEmail) => {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) throw new Error("Resend API key is not configured");
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    signal: AbortSignal.timeout(Math.max(1_000, Number(process.env.EMAIL_TIMEOUT_MS ?? 15_000) || 15_000)),
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      ...(input.idempotencyKey ? { "Idempotency-Key": input.idempotencyKey } : {}),
      "User-Agent": "slovesto/1.0"
    },
    body: JSON.stringify({
      from: input.from,
      to: Array.isArray(input.to) ? input.to : [input.to],
      ...(input.replyTo ? { reply_to: input.replyTo } : {}),
      subject: input.subject,
      html: input.html,
      text: input.text
    })
  });
  if (!response.ok) throw new Error(`Resend returned HTTP ${response.status}`);
};

export const sendTransactionalEmail = async (input: TransactionalEmail) => {
  const provider = getConfiguredEmailProvider();
  const from = input.from?.trim() || process.env.EMAIL_FROM?.trim();
  if (!provider || !from) throw new Error("Email provider is not configured");
  const resolved = { ...input, from };
  if (provider === "postbox") return sendWithPostbox(resolved);
  return sendWithResend(resolved);
};
