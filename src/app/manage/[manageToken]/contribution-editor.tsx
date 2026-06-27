"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { updateContributionMessageAction } from "./actions";
import styles from "./manage-page.module.css";

type Props = {
  contributionId: string;
  manageToken: string;
  initialMessage: string;
  messageLimit: number;
};

const initialState = {
  ok: false,
  message: ""
};

export const ContributionEditor = ({ contributionId, manageToken, initialMessage, messageLimit }: Props) => {
  const [state, formAction, isPending] = useActionState(updateContributionMessageAction, initialState);
  const [message, setMessage] = useState(initialMessage);
  const [lastSubmitted, setLastSubmitted] = useState(initialMessage);
  const formRef = useRef<HTMLFormElement>(null);
  const remaining = messageLimit - message.length;

  useEffect(() => {
    if (message === lastSubmitted) return;
    const timer = window.setTimeout(() => {
      if (!formRef.current) return;
      setLastSubmitted(message);
      formRef.current.requestSubmit();
    }, 800);
    return () => window.clearTimeout(timer);
  }, [message, lastSubmitted]);

  const saveStatus = isPending ? "saving" : state.ok && lastSubmitted === message ? "saved" : "idle";

  return (
    <form ref={formRef} action={formAction} className={styles.contentEditorForm}>
      <input type="hidden" name="manageToken" value={manageToken} />
      <input type="hidden" name="contributionId" value={contributionId} />

      <div className={styles.contentEditorHeader}>
        <label className={styles.contentEditorLabel} htmlFor={`message-${contributionId}`}>
          Текст поздравления
        </label>
        <span className={`${styles.contentEditorCounter} ${remaining < 0 ? styles.contentEditorCounterWarning : ""}`}>
          {message.length} / {messageLimit}
        </span>
      </div>

      <textarea
        id={`message-${contributionId}`}
        name="message"
        value={message}
        onChange={(event) => setMessage(event.target.value)}
        className={styles.contentEditorTextarea}
        maxLength={1500}
      />

      {remaining < 0 ? (
        <p className={styles.contentEditorHint}>
          Текст длиннее рекомендации. Администратор может сократить его, чтобы поздравление лаконично смотрелось в открытке.
        </p>
      ) : null}

      <div className={styles.contentEditorFooter}>
        <button type="button" className={styles.contentAiButton}>
          ✨ Сократить текст
        </button>
        <span className={styles.autoSaveStatus}>
          {saveStatus === "saving"
            ? "Сохраняем…"
            : saveStatus === "saved"
              ? "Изменения сохранены"
              : null}
        </span>
        {state.message ? (
          <span className={state.ok ? styles.contentEditorSuccess : styles.contentEditorError}>{state.message}</span>
        ) : null}
      </div>
    </form>
  );
};
