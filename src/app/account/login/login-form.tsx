"use client";

import Link from "next/link";
import { useActionState } from "react";
import { requestAccountAccessAction, type AccountLoginState } from "../actions";
import styles from "../account.module.css";

const initialState: AccountLoginState = { status: "idle", message: "" };

export function AccountLoginForm() {
  const [state, action, pending] = useActionState(requestAccountAccessAction, initialState);
  return (
    <form action={action} className={styles.loginForm}>
      <label className={styles.honeypot} aria-hidden="true">Сайт<input name="website" tabIndex={-1} /></label>
      <label className={styles.field}>
        <span>Email организатора</span>
        <input name="email" type="email" required autoComplete="email" placeholder="name@example.com" />
      </label>
      {state.status !== "idle" ? (
        <div className={state.status === "success" ? styles.success : styles.error} role="status">
          {state.message}
          {state.devAccessUrl ? <Link href={state.devAccessUrl}>Открыть тестовую ссылку</Link> : null}
        </div>
      ) : null}
      <button type="submit" className={styles.primaryButton} disabled={pending}>
        {pending ? "Отправляем..." : "Получить ссылку для входа"}
      </button>
      <p className={styles.formNote}>Пароль не нужен. Ссылка одноразовая и действует 15 минут.</p>
    </form>
  );
}
