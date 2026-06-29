"use client";

import { useActionState } from "react";
import { loginAdminAction } from "./actions";
import styles from "../admin.module.css";

export default function AdminLoginPage() {
  const [state, submitAction, isPending] = useActionState(loginAdminAction, {
    ok: true,
    message: ""
  });

  return (
    <main className={styles.loginPage}>
      <div className={styles.loginCard}>
        <h1 className={styles.loginTitle}>Админка</h1>
        <p className={styles.loginSubtitle}>Вход для администратора</p>

        <form action={submitAction} className={styles.loginForm}>
          <label className={styles.loginField}>
            <span>Email</span>
            <input
              type="email"
              name="email"
              autoComplete="email"
              required
              autoFocus
              defaultValue="admin@example.com"
            />
          </label>

          <label className={styles.loginField}>
            <span>Пароль</span>
            <input type="password" name="password" autoComplete="current-password" required minLength={8} />
          </label>

          {state.message && (
            <p className={state.ok ? styles.loginInfo : styles.loginError} role="alert">
              {state.message}
            </p>
          )}

          <button type="submit" className={styles.loginButton} disabled={isPending}>
            {isPending ? "Вход..." : "Войти"}
          </button>
        </form>
      </div>
    </main>
  );
}
