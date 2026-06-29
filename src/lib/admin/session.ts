import { cookies } from "next/headers";
import { getAdminAuthEnv, verifyAdminSessionToken, type AdminSession } from "./auth";
import type { AdminUserRole } from "./types";

const ADMIN_SESSION_COOKIE = "admin_session";
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7; // 7 days

export const getAdminSession = async (): Promise<AdminSession | null> => {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(ADMIN_SESSION_COOKIE)?.value;

    if (!token) {
      return null;
    }

    const { sessionSecret } = getAdminAuthEnv();
    return verifyAdminSessionToken(token, sessionSecret);
  } catch {
    return null;
  }
};

export const requireAdminRole = async (role: AdminUserRole): Promise<AdminSession> => {
  const session = await getAdminSession();

  if (!session) {
    throw new Error("Unauthorized");
  }

  const roleHierarchy: Record<AdminUserRole, number> = {
    admin: 3,
    moderator: 2,
    support: 1
  };

  if (roleHierarchy[session.role] < roleHierarchy[role]) {
    throw new Error("Forbidden");
  }

  return session;
};

export const setAdminSession = async (token: string) => {
  const cookieStore = await cookies();

  cookieStore.set(ADMIN_SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/admin",
    maxAge: SESSION_MAX_AGE_SECONDS
  });
};

export const clearAdminSession = async () => {
  const cookieStore = await cookies();

  cookieStore.set(ADMIN_SESSION_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/admin",
    maxAge: 0
  });
};

export const requireAdminSession = async (): Promise<AdminSession> => {
  const session = await getAdminSession();

  if (!session) {
    throw new Error("Unauthorized");
  }

  return session;
};
