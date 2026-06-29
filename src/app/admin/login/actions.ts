"use server";

import { redirect } from "next/navigation";
import { createAdminSessionToken, getAdminAuthEnv, verifyAdminPassword } from "@/lib/admin/auth";
import { setAdminSession, clearAdminSession } from "@/lib/admin/session";
import { getAdminUserByEmail } from "@/lib/admin/repository-phase2";
import { logger } from "@/lib/logger";

export type LoginFormState = {
  ok: boolean;
  message: string;
};

const isValidEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

export async function loginAdminAction(
  _prevState: LoginFormState,
  formData: FormData
): Promise<LoginFormState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (!isValidEmail(email) || password.length < 8) {
    return { ok: false, message: "Введите корректный email и пароль не короче 8 символов." };
  }

  try {
    const env = getAdminAuthEnv();
    const dbUser = await getAdminUserByEmail(email);

    if (dbUser) {
      if (!verifyAdminPassword(password, dbUser.passwordHash, dbUser.passwordSalt)) {
        logger.info("admin.login_failed", "Admin login failed", { email, source: "db" });
        return { ok: false, message: "Неверный email или пароль." };
      }

      const token = createAdminSessionToken(email, dbUser.role, env.sessionSecret);
      await setAdminSession(token);
      logger.info("admin.login", "Admin logged in", { email, role: dbUser.role, source: "db" });
    } else {
      if (email !== env.email.toLowerCase() || !verifyAdminPassword(password, env.passwordHash, env.passwordSalt)) {
        logger.info("admin.login_failed", "Admin login failed", { email, source: "env" });
        return { ok: false, message: "Неверный email или пароль." };
      }

      const token = createAdminSessionToken(email, "admin", env.sessionSecret);
      await setAdminSession(token);
      logger.info("admin.login", "Admin logged in", { email, role: "admin", source: "env" });
    }
  } catch (error) {
    logger.error("admin.login_error", "Admin login error", { error: String(error) });
    return { ok: false, message: "Не удалось войти. Проверьте настройки админки." };
  }

  redirect("/admin");
}

export async function logoutAdminAction() {
  await clearAdminSession();
  logger.info("admin.logout", "Admin logged out");
  redirect("/admin/login");
}
