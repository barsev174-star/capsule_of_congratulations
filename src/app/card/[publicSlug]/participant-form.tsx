"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AiHelper } from "./ai-helper";
import { GiftPollVote } from "./gift-poll-vote";
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
  greetingMode?: "classic" | "matrix" | "ladder";
};

export const ParticipantForm = ({
  cardId,
  publicSlug,
  recipientName,
  occasionText,
  messageLimit,
  variant = "default",
  greetingMode = "classic"
}: Props) => {
  const [issues, setIssues] = useState<ValidationIssue[]>([]);
  const [successMessage, setSuccessMessage] = useState("");
  const [authorName, setAuthorName] = useState("");
  const [authorRole, setAuthorRole] = useState("");
  const [message, setMessage] = useState("");
  const [aiGenerationIds, setAiGenerationIds] = useState<string[]>([]);
  const [aiResetSignal, setAiResetSignal] = useState(0);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const clearSuccessOnEdit = () => {
    if (successMessage) {
      setSuccessMessage("");
    }
  };

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      setHasSubmitted(Boolean(window.localStorage.getItem(`participant-submission-${publicSlug}`)));
    });
    return () => window.cancelAnimationFrame(frame);
  }, [publicSlug]);

  const handleSubmit = async (formData: FormData) => {
    setIssues([]);
    setSuccessMessage("");

    const storageKey = `participant-submission-${publicSlug}`;
    const participantToken = window.localStorage.getItem(storageKey) || window.crypto.randomUUID();
    formData.set("participantToken", participantToken);
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

    window.localStorage.setItem(storageKey, participantToken);
    setHasSubmitted(true);

    setSuccessMessage("Поздравление отправлено. Спасибо, ваши слова уже в открытке.");
    setAuthorName("");
    setAuthorRole("");
    setMessage("");
    setAiGenerationIds([]);
    setAiResetSignal((current) => current + 1);
    router.refresh();
  };

  return (
    <>
      {hasSubmitted ? (
        <section className={styles.participantSubmitted} aria-live="polite">
          <strong>Поздравление добавлено</strong>
          <p>Спасибо — ваши слова стали частью общей открытки.</p>
        </section>
      ) : (
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
                onChange={(event) => {
                  clearSuccessOnEdit();
                  setAuthorName(event.target.value);
                }}
              />
            </div>

            <div className={styles.field}>
              <label htmlFor="authorRole">Подпись под именем</label>
              <input
                id="authorRole"
                name="authorRole"
                placeholder="коллега, друг, семья..."
                value={authorRole}
                onChange={(event) => {
                  clearSuccessOnEdit();
                  setAuthorRole(event.target.value);
                }}
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
              onChange={(event) => {
                clearSuccessOnEdit();
                setMessage(event.target.value);
              }}
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
      )}

      {!hasSubmitted ? <AiHelper
        key={aiResetSignal}
        cardId={cardId}
        publicSlug={publicSlug}
        occasionText={occasionText}
        relationshipContext={authorRole}
        messageLimit={messageLimit}
        onUseText={(text) => {
          setMessage(text);
          setSuccessMessage("");
        }}
        onGeneration={(generationId) => {
          setAiGenerationIds((current) => current.includes(generationId) ? current : [...current, generationId]);
        }}
        variant={variant}
        greetingMode={greetingMode}
      /> : null}
      <GiftPollVote key={hasSubmitted ? "participant-submitted" : "participant-new"} publicSlug={publicSlug} active={hasSubmitted} focusOnReveal={Boolean(successMessage)} />
    </>
  );
};
