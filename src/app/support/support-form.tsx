"use client";

import { useActionState, useEffect, useRef } from "react";
import { submitSupportRequestAction, type SupportFormState } from "./actions";
import styles from "./support.module.css";

type Props = { source: string };
const initialSupportFormState: SupportFormState = { status: "idle", message: "" };

export function SupportForm({ source }: Props) {
  const [state, formAction, isPending] = useActionState(
    submitSupportRequestAction,
    initialSupportFormState
  );
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.status === "success") formRef.current?.reset();
  }, [state.status]);

  return (
    <form ref={formRef} action={formAction} className={styles.form}>
      <input type="hidden" name="source" value={source} />
      <label className={styles.honeypot} aria-hidden="true">
        Сайт
        <input name="website" tabIndex={-1} autoComplete="off" />
      </label>

      <fieldset className={styles.topicGroup}>
        <legend>Чем помочь?</legend>
        <div className={styles.topicOptions}>
          <label className={styles.topicOption}>
            <input type="radio" name="category" value="problem" defaultChecked />
            <span>Что-то не работает</span>
          </label>
          <label className={styles.topicOption}>
            <input type="radio" name="category" value="suggestion" />
            <span>Есть предложение</span>
          </label>
          <label className={styles.topicOption}>
            <input type="radio" name="category" value="question" />
            <span>Есть вопрос</span>
          </label>
        </div>
      </fieldset>

      <div className={styles.fieldRow}>
        <label className={styles.field}>
          <span>Ваше имя <small>необязательно</small></span>
          <input name="contactName" maxLength={100} autoComplete="name" placeholder="Например, Мария" />
        </label>
        <label className={styles.field}>
          <span>Email для ответа</span>
          <input name="email" type="email" maxLength={254} autoComplete="email" required placeholder="name@example.com" />
        </label>
      </div>

      <label className={styles.field}>
        <span>Сообщение</span>
        <textarea
          name="message"
          minLength={10}
          maxLength={3000}
          required
          placeholder="Расскажите, что произошло или что можно сделать лучше. Если есть ошибка, напишите, после какого действия она появилась."
        />
      </label>

      {state.status !== "idle" ? (
        <div className={state.status === "success" ? styles.success : styles.error} role="status">
          <strong>{state.status === "success" ? "Сообщение отправлено" : "Не получилось отправить"}</strong>
          <p>{state.message}</p>
          {state.ticket ? <span>Номер обращения: {state.ticket}</span> : null}
        </div>
      ) : null}

      <div className={styles.actions}>
        <button type="submit" disabled={isPending}>
          {isPending ? "Отправляем..." : "Отправить сообщение"}
        </button>
        <p>Не указывайте пароли, ключи и секретную ссылку управления открыткой.</p>
      </div>
    </form>
  );
}
