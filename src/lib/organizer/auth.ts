import { createHmac, timingSafeEqual } from "node:crypto";

export type OrganizerSession = { email: string; exp: number };

const encode = (value: string) => Buffer.from(value, "utf8").toString("base64url");
const decode = (value: string) => Buffer.from(value, "base64url").toString("utf8");

export const getOrganizerSessionSecret = () => {
  const secret = process.env.ORGANIZER_SESSION_SECRET?.trim();
  if (secret) return secret;
  if (process.env.NODE_ENV !== "production") return "dev-organizer-session-secret-change-me";
  throw new Error("ORGANIZER_SESSION_SECRET is required in production");
};

export const createOrganizerSessionToken = (
  email: string,
  secret: string,
  now = Date.now()
) => {
  const payload = encode(JSON.stringify({
    email: email.trim().toLowerCase(),
    exp: Math.floor(now / 1000) + 60 * 60 * 24 * 30
  } satisfies OrganizerSession));
  const signature = createHmac("sha256", secret).update(payload).digest("base64url");
  return `${payload}.${signature}`;
};

export const verifyOrganizerSessionToken = (
  token: string,
  secret: string,
  now = Date.now()
): OrganizerSession | null => {
  try {
    const [payload, signature] = token.split(".");
    if (!payload || !signature) return null;
    const expected = createHmac("sha256", secret).update(payload).digest();
    const received = Buffer.from(signature, "base64url");
    if (received.length !== expected.length || !timingSafeEqual(received, expected)) return null;
    const parsed = JSON.parse(decode(payload)) as OrganizerSession;
    if (typeof parsed.email !== "string" || typeof parsed.exp !== "number") return null;
    if (parsed.exp <= Math.floor(now / 1000)) return null;
    return { email: parsed.email.toLowerCase(), exp: parsed.exp };
  } catch {
    return null;
  }
};
