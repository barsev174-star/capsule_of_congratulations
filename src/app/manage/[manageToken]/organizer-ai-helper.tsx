"use client";

import { useRef, useState, useTransition } from "react";
import { TextAssistIcon } from "@/components/icons/text-assist-icon";
import type { AiJoinAction, AiVariant, AiVariantFamily } from "@/lib/ai/types";
import { AI_DRAFT_LIMIT, AI_DRAFT_MIN_LENGTH, countCharacters } from "@/lib/ai/validation";
import styles from "./manage-page.module.css";

type StoredVariant = {
  variant: AiVariant;
  generationId: string;
};

type VariantHistory = Record<AiVariantFamily, StoredVariant[]>;
type VariantIndexes = Record<AiVariantFamily, number>;
type Action = Exclude<AiJoinAction, "expand" | "shorten">;

type FailedRequest = {
  action: Action;
  requestId: string;
};

type Props = {
  cardId: string;
  manageToken: string;
  relationshipContext?: string;
  initialDraft?: string;
  onDraftChange?: (draft: string) => void;
  onGeneration?: (generationId: string) => void;
  onUseText: (text: string, generationId: string) => void;
};

const FAMILY_ORDER: AiVariantFamily[] = ["main", "warm", "creative"];
const emptyHistory = (): VariantHistory => ({ main: [], warm: [], creative: [] });
const initialIndexes: VariantIndexes = { main: 0, warm: 0, creative: 0 };

const familyLabels: Record<AiVariantFamily, string> = {
  main: "Основной",
  warm: "Теплее",
  creative: "Творческий"
};

const actionDefinitions: Record<Exclude<Action, "initial">, {
  icon: string;
  title: string;
  summary: string;
  explanation: string;
  cta: string;
  loading: string;
}> = {
  alternative: {
    icon: "↔",
    title: "Другой вариант",
    summary: "Те же мысли, но другой порядок и формулировки.",
    explanation: "Факты и пожелания останутся прежними.",
    cta: "Создать другой вариант",
    loading: "Создаём другой вариант…"
  },
  warmer: {
    icon: "♡",
    title: "Теплее",
    summary: "Больше личного тепла и благодарности.",
    explanation: "Факты и пожелания останутся прежними.",
    cta: "Создать тёплый вариант",
    loading: "Создаём тёплый вариант…"
  },
  creative: {
    icon: "✦",
    title: "Творческий",
    summary: "Свободнее композиция и выразительнее формулировки.",
    explanation: "Подача станет свободнее и образнее. Основные мысли сохранятся.",
    cta: "Создать творческий вариант",
    loading: "Создаём творческий вариант…"
  }
};

const targetFamily = (action: Action): AiVariantFamily => {
  if (action === "warmer") return "warm";
  if (action === "creative") return "creative";
  return "main";
};

const formatAttempts = (count: number) => {
  const mod10 = count % 10;
  const mod100 = count % 100;
  const noun = mod10 === 1 && mod100 !== 11
    ? "раз"
    : mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)
      ? "раза"
      : "раз";
  return `Можно попробовать ещё ${count} ${noun}`;
};

export const OrganizerAiHelper = ({
  cardId,
  manageToken,
  relationshipContext,
  initialDraft = "",
  onDraftChange,
  onGeneration,
  onUseText
}: Props) => {
  const [draft, setDraft] = useState(initialDraft);
  const [history, setHistory] = useState<VariantHistory>(emptyHistory);
  const [indexes, setIndexes] = useState<VariantIndexes>(initialIndexes);
  const [activeFamily, setActiveFamily] = useState<AiVariantFamily>("main");
  const [openAction, setOpenAction] = useState<Exclude<Action, "initial"> | null>(null);
  const [pendingAction, setPendingAction] = useState<Action | null>(null);
  const [issues, setIssues] = useState<string[]>([]);
  const [remaining, setRemaining] = useState<number | null>(null);
  const [limitReached, setLimitReached] = useState(false);
  const [failedRequest, setFailedRequest] = useState<FailedRequest | null>(null);
  const [insertFeedback, setInsertFeedback] = useState("");
  const [lastGeneratedDraft, setLastGeneratedDraft] = useState<string | null>(null);
  const [isDraftExpanded, setIsDraftExpanded] = useState(true);
  const [isPending, startTransition] = useTransition();
  const requestInFlight = useRef(false);

  const activeHistory = history[activeFamily];
  const activeIndex = Math.min(indexes[activeFamily], Math.max(0, activeHistory.length - 1));
  const activeResult = activeHistory[activeIndex] ?? null;
  const latestMain = history.main.at(-1) ?? null;
  const availableFamilies = FAMILY_ORDER.filter((family) => history[family].length > 0);
  const draftLength = countCharacters(draft);
  const draftReady = draft.trim().length >= AI_DRAFT_MIN_LENGTH;
  const hasDraftChanged = lastGeneratedDraft !== null && draft.trim() !== lastGeneratedDraft;

  const requestVariant = async (action: Action, requestId = crypto.randomUUID()) => {
    if (requestInFlight.current) return;
    requestInFlight.current = true;
    setIssues([]);
    setInsertFeedback("");
    setPendingAction(action);
    const requestDraft = draft.trim();
    const resetsHistory = action === "initial"
      && latestMain !== null
      && lastGeneratedDraft !== null
      && requestDraft !== lastGeneratedDraft;

    const sourceText = action === "initial"
      ? undefined
      : action === "alternative"
        ? latestMain?.variant.text ?? activeResult?.variant.text
        : activeResult?.variant.text ?? latestMain?.variant.text;

    try {
      const response = await fetch("/api/ai/generate-greeting", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requestId,
          cardId,
          manageToken,
          draftNotes: requestDraft,
          relationshipContext,
          style: "touching",
          joinAction: action,
          sourceText
        })
      });
      const payload = await response.json();
      if (!response.ok) {
        if (response.status === 429) {
          setRemaining(0);
          setLimitReached(true);
          setFailedRequest(null);
        } else {
          setFailedRequest({ action, requestId });
        }
        setIssues(payload.issues
          ? payload.issues.map((issue: { message: string }) => issue.message)
          : [payload.message ?? "Не получилось создать вариант."]);
        return;
      }

      const next = payload.result.variants[0] as AiVariant | undefined;
      if (!next) {
        setIssues(["Не получилось создать вариант."]);
        setFailedRequest({ action, requestId });
        return;
      }

      const family = targetFamily(action);
      const stored = { variant: next, generationId: payload.result.generationId };
      if (resetsHistory) {
        setHistory({ ...emptyHistory(), main: [stored] });
        setIndexes(initialIndexes);
        setOpenAction(null);
      } else {
        setHistory((current) => ({ ...current, [family]: [...current[family], stored] }));
        setIndexes((current) => ({ ...current, [family]: history[family].length }));
      }
      setActiveFamily(family);
      if (action === "initial") {
        setLastGeneratedDraft(requestDraft);
        setIsDraftExpanded(false);
      }
      setRemaining(payload.result.usage.remaining);
      setLimitReached(payload.result.usage.remaining === 0);
      setFailedRequest(null);
      onGeneration?.(payload.result.generationId);
    } catch {
      setIssues(["Не удалось связаться с AI-помощником. Проверьте соединение и попробуйте ещё раз."]);
      setFailedRequest({ action, requestId });
    } finally {
      requestInFlight.current = false;
      setPendingAction(null);
    }
  };

  const generate = (action: Action, requestId?: string) => {
    startTransition(async () => requestVariant(action, requestId));
  };

  const moveHistory = (direction: -1 | 1) => {
    setIndexes((current) => ({
      ...current,
      [activeFamily]: Math.max(0, Math.min(activeHistory.length - 1, current[activeFamily] + direction))
    }));
    setIssues([]);
  };

  return (
    <section className={styles.organizerAi} aria-busy={isPending}>
      <header className={styles.organizerAiHeader}>
        <span className={styles.organizerAiIcon} aria-hidden="true"><TextAssistIcon /></span>
        <div>
          <h3>Нужна помощь с текстом?</h3>
          <p>Набросайте мысли своими словами — AI соберёт из них готовое поздравление.</p>
        </div>
      </header>

      {activeResult && !isDraftExpanded ? (
        <div className={styles.organizerAiDraftCompact}>
          <div>
            <strong>Ваши исходные мысли</strong>
            <p>{draft}</p>
          </div>
          <button type="button" onClick={() => setIsDraftExpanded(true)}>Изменить</button>
        </div>
      ) : (
        <>
          <div className={styles.organizerAiDraft}>
            <div className={styles.organizerAiLabelRow}>
              <label htmlFor={`organizer-ai-draft-${cardId}`}>Что хотите сказать?</label>
              <span className={styles.organizerAiDraftMeta}>
                <span>{draftLength} / {AI_DRAFT_LIMIT}</span>
                {activeResult && !hasDraftChanged ? (
                  <button type="button" onClick={() => setIsDraftExpanded(false)}>Свернуть</button>
                ) : null}
              </span>
            </div>
            <textarea
              id={`organizer-ai-draft-${cardId}`}
              value={draft}
              maxLength={AI_DRAFT_LIMIT}
              rows={5}
              disabled={isPending && pendingAction === "initial"}
              aria-invalid={issues.length > 0 && !activeResult}
              placeholder="Например: хочу поблагодарить за поддержку и пожелать больше радостных дней."
              onChange={(event) => {
                setDraft(event.target.value);
                onDraftChange?.(event.target.value);
                setIssues([]);
                setFailedRequest(null);
              }}
            />
          </div>

          {!activeResult || hasDraftChanged ? (
            <div className={styles.organizerAiPrimaryRow}>
              <button
                type="button"
                className={styles.organizerAiPrimary}
                disabled={isPending || limitReached || !draftReady}
                onClick={() => generate("initial")}
              >
                {isPending && pendingAction === "initial"
                  ? activeResult ? "Обновляем текст…" : "Подбираем текст…"
                  : activeResult ? "Обновить по моим мыслям" : "Подобрать текст"}
              </button>
              {!draftReady && draftLength > 0 ? <span>Добавьте немного больше деталей.</span> : null}
            </div>
          ) : null}
        </>
      )}
      {isPending && pendingAction === "initial" ? (
        <span className={styles.visuallyHidden} role="status">
          {activeResult ? "Обновляем текст…" : "Подбираем текст…"}
        </span>
      ) : null}

      {!activeResult && issues.length > 0 ? (
        <div className={styles.organizerAiError} role="alert">
          <span><strong>Не получилось создать вариант.</strong> {issues[0]}</span>
          {failedRequest ? (
            <button type="button" disabled={isPending} onClick={() => generate(failedRequest.action, failedRequest.requestId)}>
              Повторить
            </button>
          ) : null}
        </div>
      ) : null}

      {activeResult ? (
        <div className={styles.organizerAiResult}>
          <div className={styles.organizerAiResultHeading}>
            <h3>Готовый текст</h3>
          </div>

          <div className={styles.organizerAiFamilies} role="tablist" aria-label="Созданные варианты текста">
            {availableFamilies.map((family) => (
              <button
                key={family}
                id={`organizer-ai-tab-${cardId}-${family}`}
                type="button"
                role="tab"
                aria-selected={family === activeFamily}
                aria-controls={`organizer-ai-panel-${cardId}`}
                onClick={() => {
                  setActiveFamily(family);
                  setIssues([]);
                }}
              >
                {familyLabels[family]}{history[family].length > 1 ? ` · ${history[family].length}` : ""}
              </button>
            ))}
          </div>

          <article
            id={`organizer-ai-panel-${cardId}`}
            className={styles.organizerAiTextCard}
            role="tabpanel"
            aria-labelledby={`organizer-ai-tab-${cardId}-${activeFamily}`}
          >
            <p>{activeResult.variant.text}</p>
            <div className={styles.organizerAiTextFooter}>
              {activeHistory.length > 1 ? (
                <div className={styles.organizerAiPager} aria-label={`Варианты категории «${familyLabels[activeFamily]}»`}>
                  <button type="button" aria-label="Предыдущий вариант" disabled={isPending || activeIndex === 0} onClick={() => moveHistory(-1)}>‹</button>
                  <span>{activeIndex + 1} из {activeHistory.length}</span>
                  <button type="button" aria-label="Следующий вариант" disabled={isPending || activeIndex === activeHistory.length - 1} onClick={() => moveHistory(1)}>›</button>
                </div>
              ) : <span />}
              <button
                type="button"
                className={styles.organizerAiUse}
                onClick={() => {
                  onUseText(activeResult.variant.text, activeResult.generationId);
                  setInsertFeedback("Текст вставлен в поздравление");
                }}
              >
                Вставить в поздравление
              </button>
            </div>
          </article>

          {isPending && pendingAction !== "initial" ? (
            <p className={styles.organizerAiProgress} role="status">
              <span aria-hidden="true" />
              {pendingAction ? actionDefinitions[pendingAction].loading : "Создаём вариант…"} Текущий текст остаётся на экране.
            </p>
          ) : null}

          {issues.length > 0 ? (
            <div className={styles.organizerAiError} role="alert">
              <span><strong>Не получилось создать вариант.</strong> Текущий текст и история сохранены.</span>
              {failedRequest ? (
                <button type="button" disabled={isPending} onClick={() => generate(failedRequest.action, failedRequest.requestId)}>
                  Повторить
                </button>
              ) : null}
            </div>
          ) : null}

          <section className={styles.organizerAiActions} aria-label="Изменить подачу текста">
            <h4>Изменить подачу</h4>
            {(Object.keys(actionDefinitions) as Array<Exclude<Action, "initial">>).map((action) => {
              const definition = actionDefinitions[action];
              const isOpen = openAction === action;
              const detailsId = `organizer-ai-${cardId}-${action}`;
              return (
                <div key={action} className={isOpen ? styles.organizerAiActionOpen : undefined}>
                  <button
                    type="button"
                    className={styles.organizerAiActionToggle}
                    aria-expanded={isOpen}
                    aria-controls={detailsId}
                    disabled={isPending}
                    onClick={() => setOpenAction((current) => current === action ? null : action)}
                  >
                    <span aria-hidden="true">{definition.icon}</span>
                    <span><strong>{definition.title}</strong><small>{definition.summary}</small></span>
                    <span aria-hidden="true">›</span>
                  </button>
                  {isOpen ? (
                    <div id={detailsId} className={styles.organizerAiActionDetails}>
                      <p>{definition.explanation}</p>
                      <button type="button" disabled={isPending || limitReached} onClick={() => generate(action)}>
                        {isPending && pendingAction === action ? definition.loading : definition.cta}
                      </button>
                      <span>1 AI-попытка</span>
                    </div>
                  ) : null}
                </div>
              );
            })}
          </section>

          {remaining !== null ? (
            <p className={styles.organizerAiAttempts} role={remaining === 0 ? "status" : undefined}>
              {remaining === 0 ? "AI-попытки закончились. Созданные варианты по-прежнему доступны." : formatAttempts(remaining)}
            </p>
          ) : null}
          {insertFeedback ? <p className={styles.organizerAiInsertFeedback} aria-live="polite">{insertFeedback}</p> : null}
        </div>
      ) : null}
    </section>
  );
};
