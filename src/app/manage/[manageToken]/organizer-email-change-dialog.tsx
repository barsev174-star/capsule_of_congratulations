"use client";

import { useRef } from "react";
import { createPortal } from "react-dom";
import styles from "./organizer-access-settings.module.css";
import { useModalFocus } from "./use-modal-focus";

type Props = {
  currentEmail: string;
  email: string;
  message: string;
  devAccessUrl?: string;
  isPending: boolean;
  onEmailChange: (email: string) => void;
  onSubmit: () => void;
  onDismiss: () => void;
};

export const OrganizerEmailChangeDialog = ({
  currentEmail,
  email,
  message,
  devAccessUrl,
  isPending,
  onEmailChange,
  onSubmit,
  onDismiss
}: Props) => {
  const dialogRef = useRef<HTMLDivElement>(null);
  useModalFocus(dialogRef, onDismiss);

  return createPortal(
    <div
      className={styles.dialogBackdrop}
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !isPending) onDismiss();
      }}
    >
      <div
        ref={dialogRef}
        className={styles.dialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby="organizer-email-dialog-title"
        aria-describedby="organizer-email-dialog-description"
        tabIndex={-1}
      >
        <div className={styles.dialogCopy}>
          <h2 id="organizer-email-dialog-title">Изменить email владельца</h2>
          <p id="organizer-email-dialog-description">
            Отправим подтверждение на новый адрес. Текущий email останется владельцем, пока переход по ссылке не подтверждён.
          </p>
        </div>

        <div className={styles.currentEmail}>
          <span>Текущий email</span>
          <strong>{currentEmail}</strong>
        </div>

        <label className={styles.emailField}>
          <span>Новый email</span>
          <input
            type="email"
            value={email}
            onChange={(event) => onEmailChange(event.target.value)}
            placeholder="new@example.com"
            maxLength={254}
            autoComplete="email"
            autoFocus
          />
        </label>

        {message ? <p className={styles.dialogFeedback} aria-live="polite">{message}</p> : null}
        {devAccessUrl ? <a className={styles.devLink} href={devAccessUrl}>Открыть тестовую ссылку</a> : null}

        <div className={styles.dialogActions}>
          <button type="button" className={styles.secondaryAction} onClick={onDismiss} disabled={isPending}>
            Отмена
          </button>
          <button
            type="button"
            className={styles.primaryAction}
            onClick={onSubmit}
            disabled={isPending || !email.trim()}
          >
            {isPending ? "Отправляем…" : "Отправить подтверждение"}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
