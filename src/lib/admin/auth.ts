import { createHmac, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import type { AdminUserRole } from "./types";

const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 7; // 7 days

export type AdminSession = {
  email: string;
  role: AdminUserRole;
  exp: number;
};

export type AdminAuthEnv = {
  email: string;
  passwordHash: string;
  passwordSalt: string;
  sessionSecret: string;
};

const base64UrlEncode = (value: string) =>
  Buffer.from(value, "utf8").toString("base64url");

const base64UrlDecode = (value: string) =>
  Buffer.from(value, "base64url").toString("utf8");

export const hashAdminPassword = (password: string, salt: string): string =>
  scryptSync(password, salt, 64).toString("hex");

export const verifyAdminPassword = (password: string, hash: string, salt: string): boolean => {
  const computed = hashAdminPassword(password, salt);

  if (computed.length !== hash.length) {
    return false;
  }

  try {
    return timingSafeEqual(Buffer.from(computed), Buffer.from(hash));
  } catch {
    return false;
  }
};

export const createAdminSessionToken = (
  email: string,
  role: AdminUserRole,
  sessionSecret: string
): string => {
  const payload: AdminSession = {
    email,
    role,
    exp: Date.now() + SESSION_TTL_MS
  };

  const payloadPart = base64UrlEncode(JSON.stringify(payload));
  const signature = createHmac("sha256", sessionSecret).update(payloadPart).digest("base64url");

  return `${payloadPart}.${signature}`;
};

export const verifyAdminSessionToken = (
  token: string,
  sessionSecret: string
): AdminSession | null => {
  const parts = token.split(".");

  if (parts.length !== 2) {
    return null;
  }

  const [payloadPart, signature] = parts;

  if (!payloadPart || !signature) {
    return null;
  }

  const expectedSignature = createHmac("sha256", sessionSecret).update(payloadPart).digest("base64url");

  if (expectedSignature.length !== signature.length) {
    return null;
  }

  try {
    if (!timingSafeEqual(Buffer.from(expectedSignature), Buffer.from(signature))) {
      return null;
    }
  } catch {
    return null;
  }

  try {
    const payload = JSON.parse(base64UrlDecode(payloadPart)) as AdminSession;

    if (typeof payload.email !== "string" || typeof payload.exp !== "number") {
      return null;
    }

    if (payload.exp <= Date.now()) {
      return null;
    }

    const validRoles: AdminUserRole[] = ["admin", "moderator", "support"];
    if (!validRoles.includes(payload.role)) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
};

export const getAdminAuthEnv = (): AdminAuthEnv => {
  const email = process.env.ADMIN_EMAIL?.trim();
  const passwordHash = process.env.ADMIN_PASSWORD_HASH?.trim();
  const passwordSalt = process.env.ADMIN_PASSWORD_SALT?.trim();
  const sessionSecret = process.env.ADMIN_SESSION_SECRET?.trim();

  if (!email || !passwordHash || !passwordSalt || !sessionSecret) {
    throw new Error("Admin auth environment variables are not configured.");
  }

  return { email, passwordHash, passwordSalt, sessionSecret };
};

export const generateAdminPassword = (password: string) => {
  const salt = randomBytes(16).toString("hex");
  const hash = hashAdminPassword(password, salt);
  return { salt, hash };
};
