"use client";

import { useState, type KeyboardEvent } from "react";
import type { AiJoinOperation, AiVariant, AiVariantFamily } from "@/lib/ai/types";
import { AI_REQUIRED_DETAIL_LIMIT, countCharacters } from "@/lib/ai/validation";
import { GREETING_HINTS, type GreetingHint, type GreetingHintId } from "./greeting-hints";
import styles from "./participant-page.module.css";

export type JoinSidePanelState = "idle" | "loading" | "result" | "error";

const LOADING_STEPS = ["Сохраняем смысл", "Собираем текст", "Проверяем детали"];
const FAMILY_ORDER: AiVariantFamily[] = ["main", "warm", "creative"];

const hintIcons: Record<GreetingHintId, string> = {
  gratitude: "♡",
  qualities: "✦",
  memory: "○",
  wishes: "↑"
};

const familyLabels: Record<AiVariantFamily, string> = {
  main: "Основной",
  warm: "Теплее",
  creative: "Творческий"
};

const operationLabels: Record<AiJoinOperation, string> = {
  initial: "Создаём основной текст…",
  warmer: "Создаём тёплый вариант…",
  creative: "Создаём творческий вариант…",
  alternative: "Создаём другой вариант…",
  expand: "Раскрываем текст подробнее…",
  shorten: "Сокращаем текст…",
  add_detail: "Добавляем ваши детали…"
};

const actionDefinitions: Record<Exclude<AiJoinOperation, "initial" | "add_detail">, {
  icon: string;
  title: string;
  summary: string;
  explanation: string;
  cta: string;
}> = {
  warmer: {
    icon: "♡",
    title: "Теплее",
    summary: "Больше личного тепла и благодарности.",
    explanation: "Текст станет теплее и личнее. Ваши мысли и пожелания сохранятся.",
    cta: "Создать тёплый вариант"
  },
  creative: {
    icon: "✦",
    title: "Творческий",
    summary: "Свободнее композиция и выразительнее формулировки.",
    explanation: "Подача станет свободнее и образнее. Ваши факты и пожелания сохранятся.",
    cta: "Создать творческий вариант"
  },
  alternative: {
    icon: "↔",
    title: "Другой вариант",
    summary: "Те же мысли, но другой порядок и формулировки.",
    explanation: "Получится ещё один основной вариант с теми же мыслями, но в другой формулировке.",
    cta: "Создать другой вариант"
  },
  expand: {
    icon: "+",
    title: "Раскрыть подробнее",
    summary: "Добавим связности, сохранив ключевые мысли.",
    explanation: "Свяжем мысли плавнее и раскроем их чуть подробнее, сохранив ваш смысл.",
    cta: "Раскрыть текст подробнее"
  },
  shorten: {
    icon: "−",
    title: "Сделать короче",
    summary: "Уберём лишние слова и повторы, сохранив главное.",
    explanation: "Уберём повторы и лишние слова, сохранив главное.",
    cta: "Сделать текст короче"
  }
};

const hintAriaLabel = (hint: GreetingHint) =>
  `Показать пример: ${hint.title.charAt(0).toLowerCase()}${hint.title.slice(1).replace(/\?$/, "")}`;

const formatAttemptsLeft = (count: number) => {
  const mod10 = count % 10;
  const mod100 = count % 100;
  if (mod10 === 1 && mod100 !== 11) return `Осталась ${count} AI-попытка`;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return `Осталось ${count} AI-попытки`;
  return `Осталось ${count} AI-попыток`;
};

type ResultProps = {
  result: AiVariant;
  family: AiVariantFamily;
  availableFamilies: AiVariantFamily[];
  familyCounts: Record<AiVariantFamily, number>;
  historyIndex: number;
  historyCount: number;
  generationId: string;
  isPending: boolean;
  pendingOperation: AiJoinOperation | null;
  limitReached: boolean;
  remaining: number | null;
  issues: string[];
  canRetry: boolean;
  messageLimit: number;
  onUseResult: (text: string) => void;
  onFamilySelect: (family: AiVariantFamily) => void;
  onRequest: (operation: AiJoinOperation) => void;
  onAddDetail: (detail: string) => void;
  onPrevious: () => void;
  onNext: () => void;
  onRetry: () => void;
};

const JoinResult = ({
  result,
  family,
  availableFamilies,
  familyCounts,
  historyIndex,
  historyCount,
  generationId,
  isPending,
  pendingOperation,
  limitReached,
  remaining,
  issues,
  canRetry,
  messageLimit,
  onUseResult,
  onFamilySelect,
  onRequest,
  onAddDetail,
  onPrevious,
  onNext,
  onRetry
}: ResultProps) => {
  const [openTool, setOpenTool] = useState<AiJoinOperation | "details" | null>(null);
  const [detail, setDetail] = useState("");
  const detailLength = countCharacters(detail);
  const panelId = `join-ai-result-${generationId || "result"}`;
  const resultLength = Array.from(result.text).length;
  const lengthAction: "expand" | "shorten" | null = resultLength <= Math.floor(messageLimit * 0.45)
    ? "expand"
    : resultLength >= Math.floor(messageLimit * 0.8)
      ? "shorten"
      : null;
  const actions: Array<Exclude<AiJoinOperation, "initial" | "add_detail">> = [
    "warmer",
    "creative",
    "alternative",
    ...(lengthAction ? [lengthAction] : [])
  ];

  const handleTabKeyDown = (event: KeyboardEvent<HTMLButtonElement>, currentFamily: AiVariantFamily) => {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight" && event.key !== "Home" && event.key !== "End") return;
    event.preventDefault();
    const currentIndex = availableFamilies.indexOf(currentFamily);
    const nextIndex = event.key === "Home"
      ? 0
      : event.key === "End"
        ? availableFamilies.length - 1
        : (currentIndex + (event.key === "ArrowRight" ? 1 : -1) + availableFamilies.length) % availableFamilies.length;
    const nextFamily = availableFamilies[nextIndex];
    onFamilySelect(nextFamily);
    const tabs = event.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>("[role='tab']");
    tabs?.[nextIndex]?.focus();
  };

  return (
    <div className={styles.panelState} id={panelId}>
      <div className={styles.resultHeadingRow}>
        <div>
          <h2 className={styles.sectionTitle}>Готовый текст</h2>
          <p className={styles.hint}>Близко к вашим мыслям — можно использовать сразу или изменить подачу.</p>
        </div>
        {!isPending && issues.length === 0 ? <span className={styles.aiGenerationReady} role="status">Готово</span> : null}
      </div>

      <div className={styles.familyTabs} role="tablist" aria-label="Созданные варианты текста">
        {FAMILY_ORDER.filter((item) => availableFamilies.includes(item)).map((item) => (
          <button
            key={item}
            type="button"
            role="tab"
            aria-selected={family === item}
            aria-controls={`${panelId}-content`}
            tabIndex={family === item ? 0 : -1}
            className={family === item ? styles.familyTabActive : undefined}
            onClick={() => onFamilySelect(item)}
            onKeyDown={(event) => handleTabKeyDown(event, item)}
          >
            {familyLabels[item]}{familyCounts[item] > 1 ? ` · ${familyCounts[item]}` : ""}
          </button>
        ))}
      </div>

      <article id={`${panelId}-content`} role="tabpanel" className={`${styles.variantCard} ${styles.singleResultCard}`}>
        <div key={generationId} className={styles.variantCardContent}>
          <p className={styles.message}>{result.text}</p>
        </div>
        <div className={styles.resultCardFooter}>
          {historyCount > 1 ? (
            <div className={styles.resultHistoryNav} aria-label={`Варианты категории «${familyLabels[family]}»`}>
              <button type="button" aria-label="Предыдущий вариант" disabled={isPending || historyIndex === 0} onClick={onPrevious}>‹</button>
              <span>{historyIndex + 1} из {historyCount}</span>
              <button type="button" aria-label="Следующий вариант" disabled={isPending || historyIndex >= historyCount - 1} onClick={onNext}>›</button>
            </div>
          ) : <span />}
          <button type="button" className={`${styles.useButton} ${styles.joinUseButton}`} onClick={() => onUseResult(result.text)}>
            <span aria-hidden="true">↓</span>
            Использовать текст
          </button>
        </div>
      </article>

      {isPending ? (
        <p className={styles.aiInlineProgress} role="status">
          <span className={styles.aiSpinner} aria-hidden="true" />
          {operationLabels[pendingOperation ?? "alternative"]} Текущий текст остаётся на экране.
        </p>
      ) : null}

      {issues.length > 0 ? (
        <div className={styles.aiRetainedError} role="alert">
          <span><strong>Не получилось создать вариант.</strong> {issues[0]} Текущий текст сохранён.</span>
          {canRetry ? <button type="button" disabled={isPending} onClick={onRetry}>Повторить</button> : null}
        </div>
      ) : null}

      <section className={styles.resultTools} aria-label="Изменить готовый текст">
        <div className={styles.resultToolsHead}>
          <h3>Хотите изменить подачу?</h3>
          <p>Выберите, каким сделать текст.</p>
        </div>

        <div className={styles.aiActionList}>
          {actions.map((operation) => {
            const definition = actionDefinitions[operation];
            const isOpen = openTool === operation;
            const isThisPending = isPending && pendingOperation === operation;
            const detailsId = `${panelId}-${operation}-details`;
            return (
              <div key={operation} className={`${styles.aiActionCard} ${isOpen ? styles.aiActionCardOpen : ""}`}>
                <button
                  type="button"
                  className={styles.aiActionRow}
                  aria-expanded={isOpen}
                  aria-controls={detailsId}
                  disabled={isPending}
                  onClick={() => setOpenTool((current) => current === operation ? null : operation)}
                >
                  <span className={styles.aiActionIcon} aria-hidden="true">{definition.icon}</span>
                  <span className={styles.aiActionCopy}>
                    <strong>{definition.title}</strong>
                    <span>{definition.summary}</span>
                  </span>
                  <span className={styles.aiActionChevron} aria-hidden="true">›</span>
                </button>
                {isOpen ? (
                  <div className={styles.aiActionDetails} id={detailsId}>
                    <p>{definition.explanation}</p>
                    <button type="button" disabled={isPending || limitReached} onClick={() => onRequest(operation)}>
                      {isThisPending ? operationLabels[operation] : definition.cta}
                    </button>
                    <span>1 AI-попытка</span>
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>

        <div className={`${styles.detailTool} ${openTool === "details" ? styles.aiActionCardOpen : ""}`}>
          <button
            type="button"
            className={styles.detailToolToggle}
            aria-expanded={openTool === "details"}
            aria-controls={`${panelId}-details`}
            disabled={isPending}
            onClick={() => setOpenTool((current) => current === "details" ? null : "details")}
          >
            <span>
              <strong>Добавить свои детали</strong>
              <small>Дополните тем, что важно упомянуть.</small>
            </span>
            <span className={`${styles.aiActionChevron} ${openTool === "details" ? styles.detailToolChevronOpen : ""}`} aria-hidden="true">›</span>
          </button>
          {openTool === "details" ? (
            <div className={styles.resultDetailForm} id={`${panelId}-details`}>
              <label htmlFor={`${panelId}-detail`}>Что ещё важно упомянуть?</label>
              <textarea
                id={`${panelId}-detail`}
                value={detail}
                aria-describedby={`${panelId}-detail-note ${panelId}-detail-count`}
                placeholder="Например: помог с переездом, дружим со школы, всегда поддерживает."
                onChange={(event) => {
                  const nextValue = event.target.value;
                  if (countCharacters(nextValue) <= AI_REQUIRED_DETAIL_LIMIT) setDetail(nextValue);
                }}
              />
              <p className={styles.detailVersionNote} id={`${panelId}-detail-note`}>
                Новые детали появятся в отдельном основном варианте. Текущие версии сохранятся.
              </p>
              <div className={styles.detailFormFooter}>
                <span id={`${panelId}-detail-count`}>{detailLength} / {AI_REQUIRED_DETAIL_LIMIT}</span>
                <button
                  type="button"
                  disabled={isPending || limitReached || detail.trim().length === 0}
                  onClick={() => {
                    onAddDetail(detail.trim());
                    setDetail("");
                    setOpenTool(null);
                  }}
                >
                  {isPending && pendingOperation === "add_detail" ? operationLabels.add_detail : "Создать вариант с деталями"}
                </button>
              </div>
            </div>
          ) : null}
        </div>

        {remaining === 0 ? (
          <p className={styles.aiLimitNotice} role="status">AI-попытки закончились. Созданные варианты по-прежнему доступны.</p>
        ) : remaining !== null ? (
          <p className={styles.aiAttemptsNotice}>{formatAttemptsLeft(remaining)}</p>
        ) : null}
      </section>
    </div>
  );
};

type Props = {
  state: JoinSidePanelState;
  result: AiVariant | null;
  family: AiVariantFamily;
  availableFamilies: AiVariantFamily[];
  familyCounts: Record<AiVariantFamily, number>;
  historyIndex: number;
  historyCount: number;
  generationId: string;
  isPending: boolean;
  pendingOperation: AiJoinOperation | null;
  limitReached: boolean;
  issues: string[];
  canRetry: boolean;
  remaining: number | null;
  messageLimit: number;
  activeHintId: GreetingHintId | null;
  activeHintExample: string | null;
  hintExampleVisible: boolean;
  exampleBlockId: string;
  hasActivePoll?: boolean;
  onHintSelect: (hint: GreetingHint) => void;
  onHideHintExample: () => void;
  onUseResult: (text: string) => void;
  onFamilySelect: (family: AiVariantFamily) => void;
  onRequest: (operation: AiJoinOperation) => void;
  onAddDetail: (detail: string) => void;
  onPrevious: () => void;
  onNext: () => void;
  onRetry: () => void;
};

export const JoinSidePanel = ({
  state,
  result,
  family,
  availableFamilies,
  familyCounts,
  historyIndex,
  historyCount,
  generationId,
  isPending,
  pendingOperation,
  limitReached,
  issues,
  canRetry,
  remaining,
  messageLimit,
  activeHintId,
  activeHintExample,
  hintExampleVisible,
  exampleBlockId,
  hasActivePoll = false,
  onHintSelect,
  onHideHintExample,
  onUseResult,
  onFamilySelect,
  onRequest,
  onAddDetail,
  onPrevious,
  onNext,
  onRetry
}: Props) => {
  const [promptsOpen, setPromptsOpen] = useState(false);

  return (
    <aside className={styles.sidePanel} aria-label="AI-помощник поздравления">
      <section className={`${styles.aiCard} ${styles.joinAiCard} ${styles.sidePanelCard}`} aria-live="polite">
        {state === "idle" ? (
          <div className={styles.panelState}>
            <div className={styles.sidePanelHead}>
              <span className={styles.sidePanelWand} aria-hidden="true" />
              <div>
                <h2 className={styles.sectionTitle}>О чём можно написать</h2>
                <p className={styles.hint}>Напишите мысли в поле поздравления. AI сохранит главное и соберёт один готовый текст.</p>
              </div>
            </div>

            <button type="button" className={styles.promptsToggle} aria-expanded={promptsOpen} onClick={() => setPromptsOpen((current) => !current)}>
              <span>Не знаете, с чего начать?</span>
              <span className={`${styles.promptsToggleIcon} ${promptsOpen ? styles.promptsToggleIconOpen : ""}`} aria-hidden="true" />
            </button>

            <ul className={`${styles.promptList} ${promptsOpen ? styles.promptListOpen : ""}`}>
              {GREETING_HINTS.map((hint) => {
                const isActive = hint.id === activeHintId;
                return (
                  <li key={hint.id}>
                    <button type="button" className={`${styles.promptButton} ${isActive ? styles.promptButtonActive : ""}`} aria-pressed={isActive} aria-controls={exampleBlockId} aria-label={hintAriaLabel(hint)} onClick={() => onHintSelect(hint)}>
                      <span className={styles.promptIcon} aria-hidden="true">{hintIcons[hint.id]}</span>
                      <span>{hint.title}</span>
                    </button>
                  </li>
                );
              })}
            </ul>

            {activeHintExample && hintExampleVisible ? (
              <div className={styles.panelExample} id={exampleBlockId} aria-live="polite">
                <div className={styles.panelExampleHead}>
                  <span className={styles.panelExampleLabel}>Например:</span>
                  <button type="button" className={styles.panelExampleHide} aria-label="Скрыть пример" onClick={onHideHintExample}>×</button>
                </div>
                <p key={activeHintExample} className={styles.panelExampleText}>{activeHintExample}</p>
                <span className={styles.panelExampleNote}>Нажмите на подсказку ещё раз, чтобы увидеть другой пример.</span>
              </div>
            ) : null}

            {hasActivePoll ? <p className={styles.panelPollTeaser}><span aria-hidden="true">🎁</span>После поздравления можно помочь выбрать подарок</p> : null}

            <footer className={styles.panelFooter}>
              <p className={styles.panelFooterNote}>Пример не вставляется автоматически — напишите мысль своими словами.</p>
              <p className={styles.privacyLock}><span aria-hidden="true">🔒</span>Черновик и результаты хранятся только до отправки.</p>
            </footer>
          </div>
        ) : null}

        {state === "loading" ? (
          <div className={styles.panelState} role="status">
            <div className={styles.sidePanelHead}>
              <span className={styles.sidePanelWand} aria-hidden="true" />
              <div>
                <h2 className={styles.sectionTitle}>Готовим текст</h2>
                <p className={styles.hint}>Сохраняем ваши мысли и укладываем текст в формат открытки.</p>
              </div>
            </div>
            <span className={styles.loadingTrack} aria-hidden="true"><span className={styles.loadingLine} /></span>
            <ul className={styles.loadingSkeletons} aria-hidden="true">
              {LOADING_STEPS.map((label, index) => (
                <li key={label} className={styles.loadingSkeleton} style={{ animationDelay: `${index * 180}ms` }}>
                  <span className={styles.loadingSkeletonLabel}>{label}</span>
                  <span className={styles.loadingSkeletonBar} />
                </li>
              ))}
            </ul>
            <footer className={styles.panelFooter}><p className={styles.panelFooterNote}>Обычно это занимает несколько секунд.</p></footer>
          </div>
        ) : null}

        {state === "error" ? (
          <div className={styles.panelState}>
            <div className={styles.sidePanelHead}>
              <span className={styles.sidePanelWand} aria-hidden="true" />
              <div>
                <h2 className={styles.sectionTitle}>Не получилось подготовить текст</h2>
                <p className={styles.hint}>Ваши мысли остались в поле.</p>
              </div>
            </div>
            {issues.length > 0 ? <ul className={styles.panelErrorList}>{issues.map((issue) => <li key={issue}>{issue}</li>)}</ul> : null}
            {canRetry ? <div><button type="button" className={styles.panelRetryButton} disabled={isPending} onClick={onRetry}>Повторить</button></div> : null}
          </div>
        ) : null}

        {state === "result" && result ? (
          <JoinResult
            result={result}
            family={family}
            availableFamilies={availableFamilies}
            familyCounts={familyCounts}
            historyIndex={historyIndex}
            historyCount={historyCount}
            generationId={generationId}
            isPending={isPending}
            pendingOperation={pendingOperation}
            limitReached={limitReached}
            remaining={remaining}
            issues={issues}
            canRetry={canRetry}
            messageLimit={messageLimit}
            onUseResult={onUseResult}
            onFamilySelect={onFamilySelect}
            onRequest={onRequest}
            onAddDetail={onAddDetail}
            onPrevious={onPrevious}
            onNext={onNext}
            onRetry={onRetry}
          />
        ) : null}
      </section>
    </aside>
  );
};
