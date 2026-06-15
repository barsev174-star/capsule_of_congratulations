"use client";

import { useState, useTransition } from "react";
import { AiHelper } from "./ai-helper";
import styles from "./participant-page.module.css";

type ValidationIssue = {
  field: string;
  message: string;
};

type Props = {
  cardId: string;
  publicSlug: string;
  recipientName: string;
  occasionText: string;
  messageLimit: number;
};

export const ParticipantForm = ({
  cardId,
  publicSlug,
  recipientName,
  occasionText,
  messageLimit
}: Props) => {
  const [issues, setIssues] = useState<ValidationIssue[]>([]);
  const [successMessage, setSuccessMessage] = useState("");
  const [authorName, setAuthorName] = useState("");
  const [authorRole, setAuthorRole] = useState("");
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();

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
    setMessage("");
  };

  return (
    <>
      <section className={styles.formCard}>
        <h2 className={styles.sectionTitle}>Добавить поздравление</h2>
        <p className={styles.hint}>
          Можно написать самостоятельно или сначала попросить AI подготовить черновик. Для текущего формата открытки
          лучше держать текст в пределах {messageLimit} символов, чтобы карточка красиво помещалась в финальный экран.
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
              <input
                id="authorName"
                name="authorName"
                placeholder="Например, Ольга"
                required
                value={authorName}
                onChange={(event) => setAuthorName(event.target.value)}
              />
            </div>

            <div className={styles.field}>
              <label htmlFor="authorRole">Подпись или роль</label>
              <input
                id="authorRole"
                name="authorRole"
                placeholder="Например, родитель / коллега / ученик"
                value={authorRole}
                onChange={(event) => setAuthorRole(event.target.value)}
              />
            </div>
          </div>

          <div className={styles.field}>
            <div className={styles.fieldLabelRow}>
              <label htmlFor="message">Текст поздравления</label>
              <span className={styles.counter}>
                {message.length} / {messageLimit}
              </span>
            </div>
            <textarea
              id="message"
              name="message"
              placeholder="Напишите несколько теплых слов. Сейчас просим хотя бы 3 слова и чуть больше конкретики, чем просто «Поздравляю!»."
              required
              maxLength={1500}
              value={message}
              onChange={(event) => setMessage(event.target.value)}
            />
            <span className={styles.hint}>
              Текст можно сначала набросать как есть, а потом отредактировать или уточнить через AI.
            </span>
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
        occasionText={occasionText}
        messageLimit={messageLimit}
        onUseText={(text) => setMessage(text)}
      />
    </>
  );
};
