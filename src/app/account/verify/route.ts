import { NextResponse } from "next/server";
import { verifyOrganizerAccess } from "@/lib/organizer/service";
import { createOrganizerSessionToken, getOrganizerSessionSecret } from "@/lib/organizer/auth";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const token = url.searchParams.get("token") ?? "";
  const email = token ? await verifyOrganizerAccess(token) : null;
  if (!email) return NextResponse.redirect(new URL("/account/login?error=expired", url));
  const response = NextResponse.redirect(new URL("/account", url));
  response.cookies.set("organizer_session", createOrganizerSessionToken(email, getOrganizerSessionSecret()), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30
  });
  return response;
}
