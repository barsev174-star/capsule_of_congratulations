import { cookies } from "next/headers";
import {
  createOrganizerSessionToken,
  getOrganizerSessionSecret,
  verifyOrganizerSessionToken
} from "./auth";

const COOKIE_NAME = "organizer_session";

export const getOrganizerSession = async () => {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  return token ? verifyOrganizerSessionToken(token, getOrganizerSessionSecret()) : null;
};

export const setOrganizerSession = async (email: string) => {
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, createOrganizerSessionToken(email, getOrganizerSessionSecret()), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30
  });
};

export const clearOrganizerSession = async () => {
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0
  });
};
