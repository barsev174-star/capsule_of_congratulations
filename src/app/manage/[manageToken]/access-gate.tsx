"use client";

import { useActionState } from "react";
import Link from "next/link";
import { BrandLogo } from "@/components/brand/brand-logo";
import {
  localBypassCardAccessAction,
  requestCardAccessAction,
  switchOrganizerAccountAction,
  type ManageAccessFormState
} from "./access-actions";
import styles from "./manage-access.module.css";

type Props = {
  cardId: string | null;
  recoveryToken?: string;
  needsEmailClaim?: boolean;
  currentEmail?: string | null;
  staffRoleDenied?: boolean;
  invalid?: boolean;
  localBypassEnabled?: boolean;
};

const initialState: ManageAccessFormState = { ok: false, message: "" };

export const ManageAccessGate = ({
  cardId,
  recoveryToken,
  needsEmailClaim = false,
  currentEmail,
  staffRoleDenied = false,
  invalid = false,
  localBypassEnabled = false
}: Props) => {
  const [state, action, pending] = useActionState(requestCardAccessAction, initialState);

  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <Link href="/" className={styles.brand} aria-label="Slovesto — на главную">
          <BrandLogo />
        </Link>
        <section className={styles.card} aria-labelledby="manage-access-title">
          <span className={styles.icon} aria-hidden="true">
            <svg viewBox="0 0 24 24">
              <path d="M3.5 6.5h17v11h-17z" />
              <path d="m4.5 7.5 7.5 6 7.5-6" />
            </svg>
          </span>
          <p className={styles.eyebrow}>Безопасное управление</p>
          <h1 id="manage-access-title">
            {invalid ? "Не удалось открыть управление открыткой" : "Подтвердите доступ"}
          </h1>
          {invalid ? (
            <p className={styles.copy}>Ссылка недействительна или больше не используется.</p>
          ) : staffRoleDenied ? (
            <p className={styles.copy}>Ваша служебная роль не разрешает управлять открытками.</p>
          ) : currentEmail ? (
            <p className={styles.copy}>
              Вы вошли как <strong>{currentEmail}</strong>. Эта открытка доступна другому аккаунту.
            </p>
          ) : needsEmailClaim ? (
            <p className={styles.copy}>Укажите email организатора. Мы закрепим открытку только после перехода по ссылке из письма.</p>
          ) : (
            <p className={styles.copy}>Отправим одноразовую ссылку на email организатора. Содержимое открытки до подтверждения не показывается.</p>
          )}

          {!invalid && !staffRoleDenied && cardId ? (
            <form action={action} className={styles.form}>
              <input type="hidden" name="cardId" value={cardId} />
              {recoveryToken ? <input type="hidden" name="recoveryToken" value={recoveryToken} /> : null}
              {needsEmailClaim ? (
                <label>
                  <span>Email организатора</span>
                  <input type="email" name="email" autoComplete="email" required maxLength={254} />
                </label>
              ) : null}
              <button type="submit" disabled={pending}>
                {pending ? "Отправляем…" : needsEmailClaim ? "Подтвердить email" : "Отправить ссылку для входа"}
              </button>
              {localBypassEnabled ? (
                <div className={styles.localBypass}>
                  <span>Только для локальной разработки</span>
                  <button type="submit" formAction={localBypassCardAccessAction} disabled={pending}>
                    Войти без письма
                  </button>
                </div>
              ) : null}
            </form>
          ) : null}

          {state.message ? (
            <p className={state.ok ? styles.success : styles.error} role="status">{state.message}</p>
          ) : null}
          {state.devAccessUrl ? <a className={styles.devLink} href={state.devAccessUrl}>Открыть тестовую ссылку</a> : null}

          <div className={styles.actions}>
            {currentEmail && cardId ? (
              <form action={switchOrganizerAccountAction}>
                <input type="hidden" name="cardId" value={cardId} />
                <button type="submit" className={styles.secondary}>Войти под другим email</button>
              </form>
            ) : null}
            <Link href="/account" className={styles.secondary}>Вернуться в мои открытки</Link>
          </div>
        </section>
      </div>
    </main>
  );
};
