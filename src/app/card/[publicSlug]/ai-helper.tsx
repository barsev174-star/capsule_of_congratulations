"use client";

import { useRef, useState, useTransition } from "react";
import { AI_DRAFT_LIMIT, AI_SHORTEN_DRAFT_LIMIT } from "@/lib/ai/validation";
import type { AiGenerationMode, AiStyle, AiVariant } from "@/lib/ai/types";
import styles from "./participant-page.module.css";

type EditOperation = "shorten" | "warmer" | "formal" | "proofread" | "detail" | "alternative";

const EDIT_OPERATIONS: Array<{
  id: EditOperation;
  label: string;
  description: string;
  mode: AiGenerationMode;
  style: AiStyle;
}> = [
  { id: "shorten", label: "Сократить до лимита", description: "Сохранить главную мысль", mode: "shorten", style: "short-no-pathos" },
  { id: "warmer", label: "Сделать теплее", description: "Добавить душевности", mode: "improve", style: "warm-simple" },
  { id: "formal", label: "Сделать официальнее", description: "Сохранить уважительный тон", mode: "improve", style: "respectful" },
  { id: "proofread", label: "Исправить ошибки", description: "Улучшить язык без смены смысла", mode: "improve", style: "warm-simple" },
  { id: "detail", label: "Добавить личную деталь", description: "Включить ещё один важный факт", mode: "improve", style: "touching" },
  { id: "alternative", label: "Предложить вариант", description: "Пересобрать текст по-новому", mode: "improve", style: "touching" }
];

type Props = {
  cardId: string;
  publicSlug?: string;
  manageToken?: string;
  occasionText: string;
  relationshipContext?: string;
  messageLimit: number;
  onUseText: (text: string, generationId: string) => void;
  onGeneration?: (generationId: string) => void;
  onDraftChange?: (draft: string) => void;
  variant?: "default" | "join";
  greetingMode?: "classic" | "matrix" | "ladder";
  sourceContributionId?: string;
  sourceText?: string;
  initialDraft?: string;
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
  onDraftChange,
  variant = "default",
  greetingMode = "classic",
  sourceContributionId,
  sourceText,
  initialDraft
}: Props) => {
  const [issues, setIssues] = useState<string[]>([]);
  const [variants, setVariants] = useState<AiVariant[]>([]);
  const [activeVariantIndex, setActiveVariantIndex] = useState(0);
  const [insertFeedback, setInsertFeedback] = useState("");
  const [draftNotes, setDraftNotes] = useState(sourceText ?? initialDraft ?? "");
  const [selectedStyle, setSelectedStyle] = useState("touching");
  const [editOperation, setEditOperation] = useState<EditOperation>("shorten");
  const [personalDetail, setPersonalDetail] = useState("");
  const [generationId, setGenerationId] = useState("");
  const [remaining, setRemaining] = useState<number | null>(null);
  const [resultLimit, setResultLimit] = useState(messageLimit);
  const [limitReached, setLimitReached] = useState(false);
  const [isPending, startTransition] = useTransition();
  const pendingRequestId = useRef<string | null>(null);

  const isEditingExisting = Boolean(sourceContributionId && sourceText);
  const availableEditOperations = isEditingExisting
    ? EDIT_OPERATIONS.filter((operation) => operation.id === "shorten" || operation.id === "proofread")
    : EDIT_OPERATIONS;
  const selectedEditOperation = availableEditOperations.find((operation) => operation.id === editOperation)
    ?? availableEditOperations[0]!;

  const handleGenerate = async (style: AiStyle, mode: AiGenerationMode = "compose") => {
    const requestId = pendingRequestId.current ?? crypto.randomUUID();
    pendingRequestId.current = requestId;
    setIssues([]);
    setInsertFeedback("");

    const detailSuffix = editOperation === "detail" && personalDetail.trim()
      ? `\n\nЛичная деталь, которую нужно добавить: ${personalDetail.trim()}`
      : "";
    const sourceForEditing = sourceText ?? draftNotes;
    const sourceBudget = Math.max(0, AI_SHORTEN_DRAFT_LIMIT - Array.from(detailSuffix).length);
    const generationDraftSource = isEditingExisting
      ? `${Array.from(sourceForEditing).slice(0, sourceBudget).join("")}${detailSuffix}`
      : draftNotes;
    const generationDraft = Array.from(generationDraftSource)
      .slice(0, isEditingExisting ? AI_SHORTEN_DRAFT_LIMIT : AI_DRAFT_LIMIT)
      .join("");

    let response: Response;
    try {
      response = await fetch("/api/ai/generate-greeting", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requestId,
          cardId,
          publicSlug,
          manageToken,
          contributionId: sourceContributionId,
          draftNotes: generationDraft,
          style,
          mode,
          editInstruction: isEditingExisting ? editOperation : undefined,
          relationshipContext
        })
      });
    } catch {
      setIssues(["Не удалось подготовить варианты. Попробуйте ещё раз через несколько секунд."]);
      return;
    } finally {
      pendingRequestId.current = null;
    }

    const payload = await response.json();
    if (!response.ok) {
      setLimitReached(response.status === 429);
      if (response.status >= 500) {
        setIssues(["Не удалось подготовить варианты. Попробуйте ещё раз через несколько секунд."]);
        return;
      }
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
  const detailIsMissing = isEditingExisting && editOperation === "detail" && personalDetail.trim().length < 5;

  const generateSelectedVariant = () => {
    const style = isEditingExisting ? selectedEditOperation.style : selectedStyle as AiStyle;
    const mode = isEditingExisting ? selectedEditOperation.mode : "compose";
    startTransition(async () => handleGenerate(style, mode));
  };

  return (
    <section className={`${styles.aiCard} ${isJoinVariant ? styles.joinAiCard : ""}`} aria-busy={isPending}>
      <div className={styles.aiHeader}>
        <div>
          <h2 className={styles.sectionTitle}>
            {isEditingExisting
              ? "Улучшить готовое поздравление"
              : isJoinVariant ? "Нужна помощь с текстом?" : "Помочь с текстом через AI"}
          </h2>
          <p className={styles.hint}>
            {isEditingExisting
              ? "Можно бережно сократить текст или исправить ошибки без изменения смысла и авторского голоса. Сначала вы увидите варианты."
              : isLadderMode
              ? `Набросайте мысли своими словами — AI предложит аккуратный, более тёплый и более живой варианты длиной до ${resultLimit} символов.`
              : `Набросайте мысли своими словами — AI соберёт из них три варианта длиной до ${resultLimit} символов.`}
          </p>
        </div>
        {isJoinVariant ? <span className={styles.wandIcon} aria-hidden="true" /> : null}
      </div>

      <div
        id={aiFormId}
        className={styles.form}
      >
        {isEditingExisting ? (
          <>
            <div className={styles.aiEditSource}>
              <span>Исходный текст</span>
              <p>{sourceText}</p>
            </div>
            <fieldset className={styles.aiEditOperations}>
              <legend>Что сделать</legend>
              <div>
                {availableEditOperations.map((operation) => (
                  <button
                    key={operation.id}
                    type="button"
                    className={editOperation === operation.id ? styles.aiEditOperationActive : undefined}
                    aria-pressed={editOperation === operation.id}
                    onClick={() => {
                      setEditOperation(operation.id);
                      setIssues([]);
                    }}
                  >
                    <strong>{operation.label}</strong>
                    <span>{operation.description}</span>
                  </button>
                ))}
              </div>
            </fieldset>
            {editOperation === "detail" ? (
              <label className={styles.aiEditDetail}>
                <span>Какую деталь добавить?</span>
                <textarea
                  value={personalDetail}
                  onChange={(event) => {
                    setPersonalDetail(event.target.value);
                    setIssues([]);
                  }}
                  maxLength={300}
                  placeholder="Например: вспомнить нашу поездку в Казань"
                />
              </label>
            ) : null}
          </>
        ) : <div className={styles.field}>
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
              onDraftChange?.(event.target.value);
              if (issues.length) setIssues([]);
            }}
            placeholder="Например: она всегда поддерживает, умеет поднять настроение, хочу пожелать ей больше отдыха и радости."
            required
            maxLength={AI_DRAFT_LIMIT}
            aria-invalid={issues.length > 0}
            aria-describedby={issues.length > 0 ? `${aiFormId}-issues` : undefined}
          />
        </div>}

        {issues.length > 0 ? (
          <div id={`${aiFormId}-issues`} className={styles.errorBox} role="alert">
            <ul className={styles.errorList}>
              {issues.map((issue) => <li key={issue}>{issue}</li>)}
            </ul>
          </div>
        ) : null}

        {!isEditingExisting && !isLadderMode ? <div className={styles.field}>
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
            type="button"
            className={isJoinVariant ? styles.aiButton : styles.submitButton}
            disabled={isPending || limitReached || detailIsMissing}
            onClick={generateSelectedVariant}
          >
            {isPending
              ? <span className={styles.aiSpinner} aria-hidden="true" />
              : isJoinVariant ? <span className={styles.aiButtonIcon} aria-hidden="true" /> : null}
            {isPending ? "Готовим варианты…" : isEditingExisting ? "Показать варианты" : "Получить 3 варианта"}
          </button>
          {remaining !== null ? (
            <span className={styles.note}>
              {remaining > 0 ? `Можно попробовать ещё ${remaining} раз` : "Лимит AI-вариантов исчерпан"}
            </span>
          ) : null}
        </div>
      </div>

      {isJoinVariant ? (
        <p className={styles.privacyNote}>
          Черновик и варианты хранятся только до отправки поздравления.
        </p>
      ) : null}

      {activeVariant ? (
        <div className={styles.variants}>
          {isPending ? (
            <div className={styles.aiGenerationProgress} role="status">
              <span className={styles.aiSpinner} aria-hidden="true" />
              <span><strong>Готовим ещё три варианта</strong>Текущие варианты останутся на экране до готовности новых.</span>
            </div>
          ) : null}
          {!isPending && issues.length === 0 ? <p key={generationId} className={styles.aiGenerationReady} role="status">Три варианта готовы</p> : null}
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
                {isEditingExisting ? "Заменить текст этим вариантом" : "Вставить в поздравление"}
              </button>
              <button
                type="button"
                className={styles.retryButton}
                disabled={isPending || limitReached}
                onClick={generateSelectedVariant}
              >
                {isPending ? "Готовим ещё…" : "Попробовать ещё"}
              </button>
            </div>
            {insertFeedback ? <p className={styles.insertFeedback} aria-live="polite">{insertFeedback}</p> : null}
          </article>
        </div>
      ) : null}
    </section>
  );
};
