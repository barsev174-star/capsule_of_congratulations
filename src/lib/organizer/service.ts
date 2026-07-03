import { createHash, randomBytes } from "node:crypto";
import { getOrganizerAccountVerifyUrl } from "@/lib/routes/card-links";
import { countRecentMagicLinks, consumeMagicLink, storeMagicLink } from "./repository";
import { sendOrganizerAccessEmail } from "./email";

const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");

export const requestOrganizerAccess = async (emailInput: string) => {
  const email = emailInput.trim().toLowerCase();
  const since = new Date(Date.now() - 60 * 60 * 1000);
  if (await countRecentMagicLinks(email, since) >= 3) return { limited: true as const };

  const token = randomBytes(32).toString("base64url");
  const tokenHash = hashToken(token);
  await storeMagicLink(email, tokenHash, new Date(Date.now() + 15 * 60 * 1000));
  await sendOrganizerAccessEmail({
    email,
    accessUrl: getOrganizerAccountVerifyUrl(token),
    idempotencyKey: `organizer-access-${tokenHash.slice(0, 24)}`
  });
  return {
    limited: false as const,
    devAccessUrl: process.env.NODE_ENV !== "production" ? getOrganizerAccountVerifyUrl(token) : undefined
  };
};

export const verifyOrganizerAccess = (token: string) => consumeMagicLink(hashToken(token));
