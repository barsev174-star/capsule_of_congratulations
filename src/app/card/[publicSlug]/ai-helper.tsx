"use client";

import { useState, useTransition } from "react";
import { AI_DRAFT_LIMIT } from "@/lib/ai/validation";
import type { AiVariant } from "@/lib/ai/types";
import styles from "./participant-page.module.css";

type Props = {
  cardId: string;
  publicSlug?: string;
  manageToken?: string;
  occasionText: string;
  relationshipContext?: string;
  messageLimit: number;
  onUseText: (text: string, generationId: string) => void;
  onGeneration?: (generationId: string) => void;
  variant?: "default" | "join";
  greetingMode?: "classic" | "matrix" | "ladder";
};

export const AiHelper = ({
  cardId,
  publicSlug,
  manageToken,
  occasionText,
  relationshipContext,
  messageLimit,
  onUseText,
  onGeneration,
  variant = "default",
  greetingMode = "classic"
}: Props) => {
  const [issues, setIssues] = useState<string[]>([]);
  const [variants, setVariants] = useState<AiVariant[]>([]);
  const [activeVariantIndex, setActiveVariantIndex] = useState(0);
  const [insertFeedback, setInsertFeedback] = useState("");
  const [draftNotes, setDraftNotes] = useState("");
  const [selectedStyle, setSelectedStyle] = useState("touching");
  const [generationId, setGenerationId] = useState("");
  const [remaining, setRemaining] = useState<number | null>(null);
  const [resultLimit, setResultLimit] = useState(messageLimit);
  const [limitReached, setLimitReached] = useState(false);
  const [isPending, startTransition] = useTransition();

  const handleGenerate = async (style: string) => {
    setIssues([]);
    setInsertFeedback("");

    let response: Response;
    try {
      response = await fetch("/api/ai/generate-greeting", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cardId, publicSlug, manageToken, draftNotes, style, relationshipContext })
      });
    } catch {
      setIssues(["Не удалось связаться с AI-помощником. Проверьте соединение и попробуйте ещё раз."]);
      return;
    }

    const payload = await response.json();
    if (!response.ok) {
      setLimitReached(response.status === 429);
      setIssues(
        payload.issues
          ? payload.issues.map((issue: { message: string }) => issue.message)
          : [payload.message ?? "Не удалось получить варианты текста."]
      );
      return;
    }

    setVariants(payload.result.variants);
    setGenerationId(payload.result.generationId);
    onGeneration?.(payload.result.generationId);
    setActiveVariantIndex(0);
    setRemaining(payload.result.usage.remaining);
    setResultLimit(payload.result.messageLimit);
    setLimitReached(payload.result.usage.remaining === 0);
  };

  const isJoinVariant = variant === "join";
  const isLadderMode = greetingMode === "ladder";
  const activeVariant = variants[activeVariantIndex] ?? variants[0];
  const aiFormId = `ai-helper-${cardId}`;

  return (
    <section className={`${styles.aiCard} ${isJoinVariant ? styles.joinAiCard : ""}`}>
      <div className={styles.aiHeader}>
        <div>
          <h2 className={styles.sectionTitle}>
            {isJoinVariant ? "Нужна помощь с текстом?" : "Помочь с текстом через AI"}
          </h2>
          <p className={styles.hint}>
            {isLadderMode
              ? `Набросайте мысли своими словами — AI предложит аккуратный, более тёплый и более живой варианты длиной до ${resultLimit} символов.`
              : `Набросайте мысли своими словами — AI соберёт из них три варианта длиной до ${resultLimit} символов.`}
          </p>
        </div>
        {isJoinVariant ? <span className={styles.wandIcon} aria-hidden="true" /> : null}
      </div>

      <form
        id={aiFormId}
        className={styles.form}
        onSubmit={(event) => {
          event.preventDefault();
          startTransition(async () => handleGenerate(selectedStyle));
        }}
      >
        <div className={styles.field}>
          <div className={styles.fieldLabelRow}>
            <label htmlFor={`${aiFormId}-draft`}>Что хотите сказать?</label>
            <span className={styles.counter}>{Array.from(draftNotes).length} / {AI_DRAFT_LIMIT}</span>
          </div>
          <textarea
            id={`${aiFormId}-draft`}
            name="draftNotes"
            className={isJoinVariant ? styles.aiTextarea : undefined}
            value={draftNotes}
            onChange={(event) => {
              setDraftNotes(event.target.value);
              if (issues.length) setIssues([]);
            }}
            placeholder="Например: она всегда поддерживает, умеет поднять настроение, хочу пожелать ей больше отдыха и радости."
            required
            maxLength={AI_DRAFT_LIMIT}
            aria-invalid={issues.length > 0}
            aria-describedby={issues.length > 0 ? `${aiFormId}-issues` : undefined}
          />
          {issues.length > 0 ? (
            <div id={`${aiFormId}-issues`} className={styles.errorBox} aria-live="polite">
              <ul className={styles.errorList}>
                {issues.map((issue) => <li key={issue}>{issue}</li>)}
              </ul>
            </div>
          ) : null}
        </div>

        {!isLadderMode ? <div className={styles.field}>
          <label htmlFor={`${aiFormId}-style`}>Стиль поздравления</label>
          <select
            id={`${aiFormId}-style`}
            name="style"
            value={selectedStyle}
            onChange={(event) => setSelectedStyle(event.target.value)}
          >
            <option value="warm-simple">Тепло и просто</option>
            <option value="short-no-pathos">Коротко без пафоса</option>
            <option value="humor">С лёгким юмором</option>
            <option value="touching">Трогательно</option>
            <option value="respectful">Уважительно</option>
          </select>
        </div> : null}

        <div className={styles.actions}>
          <button
            type="submit"
            className={isJoinVariant ? styles.aiButton : styles.submitButton}
            disabled={isPending || limitReached}
          >
            {isJoinVariant ? <span className={styles.aiButtonIcon} aria-hidden="true" /> : null}
            {isPending ? "Готовим варианты..." : "Получить 3 варианта"}
          </button>
          {remaining !== null ? (
            <span className={styles.note}>
              {remaining > 0 ? `Можно попробовать ещё ${remaining} раз` : "Лимит AI-вариантов исчерпан"}
            </span>
          ) : null}
        </div>
      </form>

      {isJoinVariant ? (
        <p className={styles.privacyNote}>
          Черновик и варианты хранятся только до отправки поздравления.
        </p>
      ) : null}

      {activeVariant ? (
        <div className={styles.variants}>
          <div className={styles.variantTabs} role="tablist" aria-label="Варианты поздравления">
            {variants.map((item, index) => (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={index === activeVariantIndex}
                className={`${styles.variantTab} ${index === activeVariantIndex ? styles.variantTabActive : ""}`}
                onClick={() => setActiveVariantIndex(index)}
              >
                {item.label}
              </button>
            ))}
          </div>
          <article className={styles.variantCard}>
            <h3 className={styles.variantTitle}>{activeVariant.label}</h3>
            <p className={styles.message}>{activeVariant.text}</p>
            <div className={styles.variantActions}>
              <button
                type="button"
                className={styles.useButton}
                onClick={() => {
                  onUseText(activeVariant.text, generationId);
                  setInsertFeedback("Текст вставлен в поздравление");
                }}
              >
                Вставить в поздравление
              </button>
              <button
                type="submit"
                form={aiFormId}
                className={styles.retryButton}
                disabled={isPending || limitReached}
              >
                Попробовать ещё
              </button>
            </div>
            {insertFeedback ? <p className={styles.insertFeedback} aria-live="polite">{insertFeedback}</p> : null}
          </article>
        </div>
      ) : null}
    </section>
  );
};
