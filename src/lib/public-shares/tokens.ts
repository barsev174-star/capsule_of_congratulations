import { createHash, createHmac } from "node:crypto";

const tokenSecret = () => {
  const secret = process.env.PUBLIC_SHARE_TOKEN_SECRET;
  if (secret) return secret;
  if (process.env.NODE_ENV !== "production") return "local-public-share-token-secret";
  throw new Error("PUBLIC_SHARE_TOKEN_SECRET is not configured.");
};

// The opaque token can be recreated for the recipient from the public share ID,
// while the database still contains only its SHA-256 hash.
export const createPublicShareToken = (publicShareId: string) =>
  createHmac("sha256", tokenSecret()).update(publicShareId, "utf8").digest("base64url");

export const hashPublicShareToken = (token: string) =>
  createHash("sha256").update(token, "utf8").digest("hex");
