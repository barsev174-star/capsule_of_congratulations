import { createHash } from "node:crypto";

export const hashParticipantToken = (token: string) =>
  createHash("sha256").update(token.trim()).digest("hex");

export const isParticipantToken = (token: unknown): token is string =>
  typeof token === "string" && /^[a-f0-9-]{20,}$/i.test(token.trim());
