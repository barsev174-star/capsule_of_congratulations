import { NextResponse } from "next/server";
import { verifyOrganizerAccess } from "@/lib/organizer/service";
import { createOrganizerSessionToken, getOrganizerSessionSecret } from "@/lib/organizer/auth";
import { claimCardOrganizerEmail, transferCardOrganizerEmail } from "@/lib/cards/repository";
import { logger } from "@/lib/logger";

const safeReturnPath = (value: string | null) =>
  value && (/^\/manage\/[0-9a-f-]{36}$/i.test(value) || value === "/account") ? value : "/account";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL?.trim() || url.origin).replace(/\/+$/, "");
  const token = url.searchParams.get("token") ?? "";
  const access = token ? await verifyOrganizerAccess(token) : null;
  if (!access) return NextResponse.redirect(new URL("/account/login?error=expired", siteUrl));
  if (access.claimCardId) {
    const claimed = await claimCardOrganizerEmail(access.claimCardId, access.email);
    if (!claimed) {
      return NextResponse.redirect(new URL("/account/login?error=claim", siteUrl));
    }
  }
  if (access.transferCardId) {
    const transferred = await transferCardOrganizerEmail(access.transferCardId, access.email);
    if (!transferred) return NextResponse.redirect(new URL("/account/login?error=transfer", siteUrl));
  }
  if (access.claimCardId || access.transferCardId || access.returnPath?.startsWith("/manage/")) {
    logger.info("manage.recovery_succeeded", "Passwordless card management access was confirmed", {
      cardId: access.claimCardId ?? access.transferCardId ?? access.returnPath?.slice("/manage/".length),
      initialClaim: Boolean(access.claimCardId),
      ownershipTransfer: Boolean(access.transferCardId)
    });
  }
  const response = NextResponse.redirect(new URL(safeReturnPath(access.returnPath), siteUrl));
  response.cookies.set("organizer_session", createOrganizerSessionToken(access.email, getOrganizerSessionSecret()), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30
  });
  return response;
}
