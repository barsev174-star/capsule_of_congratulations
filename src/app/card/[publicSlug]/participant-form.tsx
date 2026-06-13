"use client";

import { useRef, useState, useTransition } from "react";
import styles from "./participant-page.module.css";
import { AiHelper } from "./ai-helper";

type ValidationIssue = {
  field: string;
  message: string;
};

type Props = {
  cardId: string;
  publicSlug: string;
  recipientName: string;
  occasion: string;
};

export const ParticipantForm = ({ cardId, publicSlug, recipientName, occasion }: Props) => {
  const [issues, setIssues] = useState<ValidationIssue[]>([]);
  const [successMessage, setSuccessMessage] = useState("");
  const [isPending, startTransition] = useTransition();
  const messageRef = useRef<HTMLTextAreaElement | null>(null);

  const handleSubmit = async (formData: FormData) => {
    setIssues([]);
    setSuccessMessage("");

    const response = await fetch("/api/contributions", {
      method: "POST",
      body: formData,
      headers: {
        "x-card-slug": publicSlug
      }
    });

    const payload = await response.json();

    if (!response.ok) {
      setIssues(payload.issues ?? [{ field: "form", message: payload.message ?? "Не удалось сохранить поздравление." }]);
      return;
    }

    setSuccessMessage("Ваше поздравление добавлено. После обновления страницы оно появится в списке.");
  };

  return (
    <>
      <section className={styles.formCard}>
        <h2 className={styles.sectionTitle}>Добавить поздравление</h2>
        <p className={styles.hint}>
          Можно написать самостоятельно или сначала попросить AI подготовить черновик. Слишком короткие и
          пустые тексты теперь не пройдут.
        </p>

        <form
          className={styles.form}
          action={(formData) => {
            formData.set("cardId", cardId);

            startTransition(async () => {
              await handleSubmit(formData);
            });
          }}
        >
          {issues.length > 0 ? (
            <div className={styles.errorBox} aria-live="polite">
              <strong>Нужно поправить несколько полей:</strong>
              <ul className={styles.errorList}>
                {issues.map((issue) => (
                  <li key={`${issue.field}-${issue.message}`}>{issue.message}</li>
                ))}
              </ul>
            </div>
          ) : null}

          {successMessage ? (
            <div className={styles.successCard} aria-live="polite">
              <p>{successMessage}</p>
            </div>
          ) : null}

          <input type="hidden" name="cardId" value={cardId} />

          <div className={styles.fieldGrid}>
            <div className={styles.field}>
              <label htmlFor="authorName">Ваше имя</label>
              <input id="authorName" name="authorName" placeholder="Например, Ольга" required />
            </div>

            <div className={styles.field}>
              <label htmlFor="authorRole">Подпись или роль</label>
              <input id="authorRole" name="authorRole" placeholder="Например, родитель / коллега / ученик" />
            </div>
          </div>

          <div className={styles.field}>
            <label htmlFor="message">Текст поздравления</label>
            <textarea
              id="message"
              name="message"
              placeholder="Напишите несколько теплых слов. Сейчас просим хотя бы 3 слова и чуть больше конкретики, чем просто “Поздравляю!”."
              required
              ref={messageRef}
            />
          </div>

          <div className={styles.actions}>
            <button type="submit" className={styles.submitButton} disabled={isPending}>
              {isPending ? "Сохраняем..." : "Добавить поздравление"}
            </button>
          </div>
        </form>
      </section>

      <AiHelper
        cardId={cardId}
        recipientName={recipientName}
        occasion={occasion}
        onUseText={(text) => {
          if (messageRef.current) {
            messageRef.current.value = text;
            messageRef.current.focus();
          }
        }}
      />
    </>
  );
};
