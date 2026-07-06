"use client";

import Link from "next/link";
import { useActionState, useEffect, useRef } from "react";
import Image from "next/image";
import { createReminderAction, type ReminderFormState } from "./reminder-actions";
import styles from "@/app/card/[publicSlug]/participant-page.module.css";

type Props = {
  sourceCardId: string;
  minimumEventDate: string;
};

const initialState: ReminderFormState = { status: "idle", title: "", lines: [], schedule: null };

export function EventReminderForm({ sourceCardId, minimumEventDate }: Props) {
  const [state, formAction, isPending] = useActionState(createReminderAction, initialState);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.status === "success" || state.status === "warning") formRef.current?.reset();
  }, [state.status]);

  return (
    <section className={styles.reminderCard} aria-labelledby="reminder-title">
      <div className={styles.reminderIntro}>
        <Image
          className={styles.reminderGift}
          src="/assets/envelope-reminder.png"
          alt=""
          width={120}
          height={90}
          aria-hidden="true"
        />
        <p className={styles.valuePreviewEyebrow}>Напомним заранее</p>
        <h2 id="reminder-title">Есть повод скоро?</h2>
        <p>Оставьте дату — мы напомним, когда будет время собрать такую же открытку.</p>
      </div>

      <form ref={formRef} action={formAction} className={styles.reminderForm}>
        <input type="hidden" name="sourceCardId" value={sourceCardId} />
        <label className={styles.reminderHoneypot} aria-hidden="true">
          Сайт
          <input name="website" tabIndex={-1} autoComplete="off" />
        </label>

        <div className={styles.reminderFieldsTop}>
          <label className={styles.reminderField}>
            <span>Кого поздравить?</span>
            <input name="recipientName" required maxLength={100} placeholder="Например, маму" />
          </label>
          <label className={styles.reminderField}>
            <span>Повод</span>
            <input name="occasionText" required maxLength={80} placeholder="День рождения" />
          </label>
          <label className={styles.reminderField}>
            <span>Дата</span>
            <input name="eventDate" type="date" required min={minimumEventDate} />
          </label>
        </div>

        <div className={styles.reminderFieldsBottom}>
          <label className={`${styles.reminderField} ${styles.reminderEmail}`}>
            <span>Email</span>
            <input name="email" type="email" required maxLength={254} autoComplete="email" placeholder="name@example.com" />
          </label>
          <button type="submit" className={styles.reminderButton} disabled={isPending}>
            {isPending ? "Сохраняем..." : "Напомнить мне"}
          </button>
        </div>

        <label className={styles.reminderConsent}>
          <input type="checkbox" name="consent" required />
          <span>Разрешаю отправить подтверждение сейчас и одно напоминание ближе к событию.</span>
        </label>
        <p className={styles.reminderCancelHint}>✉ Напоминание можно отменить по ссылке из письма.</p>

        {state.status !== "idle" ? (
          <div
            className={state.status === "error" ? styles.reminderError : state.status === "warning" ? styles.reminderWarning : styles.reminderSuccess}
            role={state.status === "error" ? "alert" : "status"}
          >
            <strong className={styles.reminderResultTitle}>{state.title}</strong>
            {state.lines.map((line) => <p key={line}>{line}</p>)}
            {(state.schedule === "next_day" || state.schedule === "confirmation_only") ? (
              <Link className={styles.reminderCreateLink} href="/create">Создать открытку сейчас</Link>
            ) : null}
          </div>
        ) : null}

        <p className={styles.reminderHelper}>
          Пришлём письмо заранее, чтобы вы успели собрать открытку от всех.
        </p>
      </form>
    </section>
  );
}
