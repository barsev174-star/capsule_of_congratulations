"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
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
  variant?: "default" | "join";
};

export const ParticipantForm = ({
  cardId,
  publicSlug,
  recipientName,
  occasionText,
  messageLimit,
  variant = "default"
}: Props) => {
  const [issues, setIssues] = useState<ValidationIssue[]>([]);
  const [successMessage, setSuccessMessage] = useState("");
  const [authorName, setAuthorName] = useState("");
  const [authorRole, setAuthorRole] = useState("");
  const [message, setMessage] = useState("");
  const [aiGenerationIds, setAiGenerationIds] = useState<string[]>([]);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

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

    setSuccessMessage("Поздравление добавлено в открытку.");
    setMessage("");
    setAiGenerationIds([]);
    router.refresh();
  };

  return (
    <>
      <section className={styles.formCard}>
        <div className={styles.cardHeader}>
          {variant === "join" ? <span className={`${styles.cardIcon} ${styles.pencilIcon}`} aria-hidden="true" /> : null}
          <div>
            <h2 className={styles.sectionTitle}>Ваше поздравление</h2>
            <p className={styles.hint}>
              {variant === "join"
                ? "Напишите от себя — просто и по-настоящему"
                : `Напишите сами или попросите AI помочь с черновиком. Лучше уложиться в ${messageLimit} символов, чтобы текст красиво смотрелся в готовой открытке.`}
            </p>
          </div>
        </div>

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
              <strong>💌 Слова подарены</strong>
              <p>{successMessage}</p>
            </div>
          ) : null}

          <input type="hidden" name="cardId" value={cardId} />
          <input type="hidden" name="aiGenerationIds" value={aiGenerationIds.join(",")} />

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
              <label htmlFor="authorRole">Подпись под именем</label>
              <input
                id="authorRole"
                name="authorRole"
                placeholder="коллега, друг, семья..."
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
              placeholder="Напишите несколько теплых слов: что цените, за что благодарны, какой момент хочется вспомнить..."
              required
              maxLength={1500}
              value={message}
              onChange={(event) => setMessage(event.target.value)}
            />
            <span className={styles.fieldHint}>
              Пишите просто и по-настоящему. Даже несколько теплых фраз уже много значат.
            </span>
          </div>

          <div className={styles.actions}>
            <button type="submit" className={styles.submitButton} disabled={isPending || Boolean(successMessage)}>
              {!successMessage ? <span className={styles.buttonIcon} aria-hidden="true" /> : null}
              {successMessage ? "✓ Слова подарены" : isPending ? "Добавляем..." : "Подарить слова"}
            </button>
            <p className={styles.submitHint}>Ваше поздравление попадёт в открытку.</p>
          </div>
        </form>
      </section>

      <AiHelper
        cardId={cardId}
        publicSlug={publicSlug}
        occasionText={occasionText}
        relationshipContext={authorRole}
        messageLimit={messageLimit}
        onUseText={(text) => {
          setMessage(text);
        }}
        onGeneration={(generationId) => {
          setAiGenerationIds((current) => current.includes(generationId) ? current : [...current, generationId]);
        }}
        variant={variant}
      />
    </>
  );
};
