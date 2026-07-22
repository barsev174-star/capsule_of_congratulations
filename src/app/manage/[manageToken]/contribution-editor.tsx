"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import type { AiVariant } from "@/lib/ai/types";
import { updateContributionMessageAction } from "./actions";
import styles from "./manage-page.module.css";

type Props = {
  cardId: string;
  contributionId: string;
  manageToken: string;
  initialMessage: string;
  messageLimit: number;
};

const initialState = {
  ok: false,
  message: ""
};

type AiEditTask = "improve" | "shorten";

const variantLabels: Record<AiEditTask, Record<AiVariant["id"], string>> = {
  improve: { short: "Бережно", warm: "Теплее", style: "Яснее" },
  shorten: { short: "Бережно", warm: "Короче", style: "Самое короткое" }
};

export const ContributionEditor = ({ cardId, contributionId, manageToken, initialMessage, messageLimit }: Props) => {
  const [state, formAction, isPending] = useActionState(updateContributionMessageAction, initialState);
  const [message, setMessage] = useState(initialMessage);
  const [lastSubmitted, setLastSubmitted] = useState(initialMessage);
  const [aiVariants, setAiVariants] = useState<AiVariant[]>([]);
  const [activeVariantIndex, setActiveVariantIndex] = useState(0);
  const [aiGenerationId, setAiGenerationId] = useState("");
  const [aiError, setAiError] = useState("");
  const [aiRemaining, setAiRemaining] = useState<number | null>(null);
  const [isAiPending, setIsAiPending] = useState(false);
  const [aiTask, setAiTask] = useState<AiEditTask>("improve");
  const formRef = useRef<HTMLFormElement>(null);
  const pendingRequestId = useRef<string | null>(null);
  const remaining = messageLimit - message.length;
  const activeVariant = aiVariants[activeVariantIndex] ?? aiVariants[0];

  useEffect(() => {
    if (message === lastSubmitted) return;
    const timer = window.setTimeout(() => {
      if (!formRef.current) return;
      setLastSubmitted(message);
      formRef.current.requestSubmit();
    }, 800);
    return () => window.clearTimeout(timer);
  }, [message, lastSubmitted]);

  const requestAiEdit = async (task: AiEditTask) => {
    const requestId = pendingRequestId.current ?? crypto.randomUUID();
    pendingRequestId.current = requestId;
    setIsAiPending(true);
    setAiError("");
    setAiTask(task);

    try {
      const response = await fetch("/api/ai/generate-greeting", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requestId,
          cardId,
          contributionId,
          manageToken,
          draftNotes: message,
          style: task === "shorten" ? "short-no-pathos" : "warm-simple",
          mode: task
        })
      });
      const payload = await response.json();

      if (!response.ok) {
        setAiError(
          payload.issues?.map((issue: { message: string }) => issue.message).join(" ") ||
            payload.message ||
            "Не удалось подготовить варианты. Попробуйте ещё раз."
        );
        return;
      }

      setAiVariants(payload.result.variants);
      setActiveVariantIndex(0);
      setAiGenerationId(payload.result.generationId);
      setAiRemaining(payload.result.usage.remaining);
    } catch {
      setAiError("Не удалось связаться с AI-помощником. Проверьте соединение и попробуйте ещё раз.");
    } finally {
      pendingRequestId.current = null;
      setIsAiPending(false);
    }
  };

  const applyAiVariant = () => {
    if (!activeVariant) return;
    setMessage(activeVariant.text);
    setAiVariants([]);
    setAiError("");
  };

  const saveStatus = isPending ? "saving" : state.ok && lastSubmitted === message ? "saved" : "idle";

  return (
    <form ref={formRef} action={formAction} className={styles.contentEditorForm}>
      <input type="hidden" name="manageToken" value={manageToken} />
      <input type="hidden" name="contributionId" value={contributionId} />
      <input type="hidden" name="aiGenerationId" value={aiGenerationId} />

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
        onChange={(event) => {
          setMessage(event.target.value);
          if (aiVariants.length) setAiVariants([]);
          if (aiError) setAiError("");
        }}
        className={styles.contentEditorTextarea}
        maxLength={1500}
      />

      {remaining < 0 ? (
        <p className={styles.contentEditorHint}>
          Текст длиннее рекомендации. AI может бережно сократить его до {messageLimit} символов.
        </p>
      ) : null}

      {activeVariant ? (
        <section
          className={styles.contentAiPreview}
          aria-label={aiTask === "shorten" ? "Вариант сокращения" : "Вариант улучшенного текста"}
        >
          <div className={styles.contentAiPreviewHeader}>
            <div>
              <strong>{aiTask === "shorten" ? "AI-сокращение" : "AI-редактура"}</strong>
              <span>{activeVariant.text.length} из {messageLimit} символов</span>
            </div>
            {aiRemaining !== null ? <span>Ещё {aiRemaining}</span> : null}
          </div>
          <div
            className={styles.contentAiVariantTabs}
            role="tablist"
            aria-label={aiTask === "shorten" ? "Степень сокращения" : "Вариант редактуры"}
          >
            {aiVariants.map((variant, index) => (
              <button
                key={variant.id}
                type="button"
                role="tab"
                aria-selected={index === activeVariantIndex}
                className={`${styles.contentAiVariantTab} ${index === activeVariantIndex ? styles.contentAiVariantTabActive : ""}`}
                onClick={() => setActiveVariantIndex(index)}
              >
                {variantLabels[aiTask][variant.id]}
              </button>
            ))}
          </div>
          <p className={styles.contentAiPreviewText}>{activeVariant.text}</p>
          <div className={styles.contentAiPreviewActions}>
            <button type="button" className={styles.contentPrimaryButton} onClick={applyAiVariant}>
              Применить
            </button>
            <button
              type="button"
              className={styles.contentSoftButton}
              onClick={() => requestAiEdit(aiTask)}
              disabled={isAiPending}
            >
              {isAiPending ? "Готовим..." : "Попробовать ещё"}
            </button>
            <button type="button" className={styles.contentAiCancelButton} onClick={() => setAiVariants([])}>
              Отмена
            </button>
          </div>
        </section>
      ) : null}

      <div className={styles.contentEditorFooter}>
        {!activeVariant ? (
          <div className={styles.contentAiEditActions}>
            <button
              type="button"
              className={styles.contentAiButton}
              onClick={() => requestAiEdit("improve")}
              disabled={isAiPending}
            >
              <span aria-hidden="true">✦</span>
              {isAiPending && aiTask === "improve" ? "Улучшаем..." : "Улучшить с AI"}
            </button>
            {remaining < 0 ? (
              <button
                type="button"
                className={`${styles.contentAiButton} ${styles.contentAiButtonSecondary}`}
                onClick={() => requestAiEdit("shorten")}
                disabled={isAiPending}
              >
                {isAiPending && aiTask === "shorten" ? "Сокращаем..." : "Сократить с AI"}
              </button>
            ) : null}
          </div>
        ) : null}
        <span className={styles.autoSaveStatus} aria-live="polite">
          {saveStatus === "saving"
            ? "Сохраняем..."
            : saveStatus === "saved"
              ? "Изменения сохранены"
              : null}
        </span>
        {aiError ? <span className={styles.contentEditorError} role="alert">{aiError}</span> : null}
        {state.message ? (
          <span className={state.ok ? styles.contentEditorSuccess : styles.contentEditorError}>{state.message}</span>
        ) : null}
      </div>
    </form>
  );
};
