"use client";

import { useState } from "react";
import type { AiJoinAction, AiJoinResultMode, AiVariant } from "@/lib/ai/types";
import { GREETING_HINTS, type GreetingHint, type GreetingHintId } from "./greeting-hints";
import styles from "./participant-page.module.css";

export type JoinSidePanelState = "idle" | "loading" | "result" | "error";

const LOADING_STEPS = ["Сохраняем смысл", "Собираем текст", "Проверяем детали"];

const actionLabels: Record<AiJoinAction, string> = {
  initial: "Собираем основной текст",
  warmer: "Делаем текст теплее",
  creative: "Готовим творческую версию",
  alternative: "Собираем ещё один вариант",
  shorten: "Сокращаем текст"
};

const modeLabels: Record<AiJoinResultMode, string> = {
  initial: "Основной",
  warmer: "Теплее",
  creative: "Творческий",
  shorten: "Короче"
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
  mode: AiJoinResultMode;
  availableModes: AiJoinResultMode[];
  historyIndex: number;
  historyCount: number;
  generationId: string;
  isPending: boolean;
  pendingAction: AiJoinAction | null;
  limitReached: boolean;
  remaining: number | null;
  issues: string[];
  messageLimit: number;
  onUseResult: (text: string) => void;
  onModeSelect: (mode: AiJoinResultMode) => void;
  onAnother: () => void;
  onAddDetail: (detail: string) => void;
  onPrevious: () => void;
  onNext: () => void;
};

const JoinResult = ({
  result,
  mode,
  availableModes,
  historyIndex,
  historyCount,
  generationId,
  isPending,
  pendingAction,
  limitReached,
  remaining,
  issues,
  messageLimit,
  onUseResult,
  onModeSelect,
  onAnother,
  onAddDetail,
  onPrevious,
  onNext
}: ResultProps) => {
  const [collapsed, setCollapsed] = useState(false);
  const [inserted, setInserted] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detail, setDetail] = useState("");
  const panelId = `join-ai-result-${generationId || "result"}`;
  const canShorten = Array.from(result.text).length > Math.min(220, Math.floor(messageLimit * 0.75));

  const applyResult = () => {
    onUseResult(result.text);
    setInserted(true);
    if (window.matchMedia("(max-width: 959px)").matches) setCollapsed(true);
  };

  if (collapsed) {
    return (
      <div className={styles.variantCollapsedStack}>
        {isPending ? (
          <div className={styles.aiGenerationProgress} role="status">
            <span className={styles.aiSpinner} aria-hidden="true" />
            <span><strong>{actionLabels[pendingAction ?? "alternative"]}</strong>Вставленный текст останется без изменений.</span>
          </div>
        ) : null}
        <div className={styles.variantCollapsedRow}>
          <span>Текст вставлен</span>
          <button type="button" className={styles.variantCollapsedButton} aria-expanded={false} aria-controls={panelId} onClick={() => setCollapsed(false)}>
            Показать результат
            <span className={styles.variantCollapsedIcon} aria-hidden="true">▾</span>
          </button>
        </div>
        {remaining === 0 ? (
          <p className={styles.aiLimitNotice} role="status">AI-попытки закончились. Поэтому варианты изменения сейчас недоступны.</p>
        ) : null}
      </div>
    );
  }

  return (
    <div className={styles.panelState} id={panelId}>
      <div className={styles.resultHeadingRow}>
        <div>
          <h2 className={styles.sectionTitle}>Готовый текст</h2>
          <p className={styles.hint}>Близко к вашим мыслям — можно использовать сразу или изменить подачу.</p>
        </div>
        {!isPending && issues.length === 0 ? <span className={styles.aiGenerationReady} role="status">Готово</span> : null}
      </div>

      {isPending ? (
        <div className={styles.aiGenerationProgress} role="status">
          <span className={styles.aiSpinner} aria-hidden="true" />
          <span><strong>{actionLabels[pendingAction ?? "alternative"]}</strong>Текущий текст останется на экране до готовности нового.</span>
        </div>
      ) : null}
      {!isPending && issues.length > 0 ? (
        <div className={styles.aiRetainedError} role="alert">
          <strong>Новая версия не подготовилась</strong>
          <span>{issues[0]} Текущий текст сохранён.</span>
        </div>
      ) : null}

      <article className={`${styles.variantCard} ${styles.singleResultCard}`}>
        <span className={styles.resultModeLabel}>{modeLabels[mode]}</span>
        <div key={generationId} className={styles.variantCardContent}>
          <p className={styles.message}>{result.text}</p>
        </div>
        <button type="button" className={`${styles.useButton} ${styles.joinUseButton}`} onClick={applyResult}>
          <span aria-hidden="true">↓</span>
          Использовать текст
        </button>
      </article>

      <section className={styles.resultTools} aria-label="Изменить готовый текст">
        <div className={styles.resultToolsHead}>
          <h3>Хотите изменить подачу?</h3>
          <p>Каждое действие создаёт одну новую версию.</p>
        </div>
        <div className={styles.resultActionGrid} role="tablist" aria-label="Режим текста">
          {(["initial", "warmer", "creative"] as const).map((item) => (
            <button
              key={item}
              type="button"
              role="tab"
              aria-selected={mode === item}
              className={mode === item ? styles.resultActionActive : undefined}
              disabled={isPending || (limitReached && !availableModes.includes(item))}
              onClick={() => onModeSelect(item)}
            >
              {modeLabels[item]}
            </button>
          ))}
          {canShorten || availableModes.includes("shorten") ? (
            <button
              type="button"
              role="tab"
              aria-selected={mode === "shorten"}
              className={mode === "shorten" ? styles.resultActionActive : undefined}
              disabled={isPending || (limitReached && !availableModes.includes("shorten"))}
              onClick={() => onModeSelect("shorten")}
            >
              Короче
            </button>
          ) : null}
        </div>
        <button type="button" className={styles.anotherResultButton} disabled={isPending || limitReached} onClick={onAnother}>
          Ещё вариант «{modeLabels[mode]}»
        </button>
        <div className={styles.resultActionGrid}>
          <button type="button" className={detailOpen ? styles.resultActionActive : undefined} aria-expanded={detailOpen} disabled={isPending || limitReached} onClick={() => setDetailOpen((current) => !current)}>
            Добавить детали
          </button>
        </div>
        <p className={styles.creativeNote}>«Творческий» может добавить одну образную деталь, но сохранит ваши основные мысли.</p>

        {detailOpen ? (
          <div className={styles.resultDetailForm}>
            <label htmlFor={`${panelId}-detail`}>Какую деталь добавить?</label>
            <textarea id={`${panelId}-detail`} value={detail} maxLength={300} placeholder="Например: он помог мне с переездом" onChange={(event) => setDetail(event.target.value)} />
            <button
              type="button"
              disabled={isPending || limitReached || detail.trim().length < 5}
              onClick={() => {
                onAddDetail(detail.trim());
                setDetailOpen(false);
                setDetail("");
              }}
            >
              Добавить и обновить текст
            </button>
          </div>
        ) : null}

        {historyCount > 1 ? (
          <div className={styles.resultHistoryNav} aria-label={`Варианты режима «${modeLabels[mode]}»`}>
            <button type="button" className={styles.restoreResultButton} disabled={isPending || historyIndex === 0} onClick={onPrevious}>← Предыдущий</button>
            <span>{historyIndex + 1} из {historyCount}</span>
            <button type="button" className={styles.restoreResultButton} disabled={isPending || historyIndex >= historyCount - 1} onClick={onNext}>Следующий →</button>
          </div>
        ) : null}

        {remaining === 0 ? (
          <p className={styles.aiLimitNotice} role="status">AI-попытки закончились. Поэтому создание новых вариантов и добавление деталей недоступны.</p>
        ) : remaining !== null ? (
          <p className={styles.aiAttemptsNotice}>{formatAttemptsLeft(remaining)}</p>
        ) : null}
      </section>

      <footer className={styles.panelFooter}>
        <p className={styles.panelFooterNote}>
          {inserted
            ? "Текст уже добавлен в поле слева. Его можно свободно отредактировать перед отправкой."
            : "Текст не отправится автоматически. Сначала добавьте его в поле поздравления."}
        </p>
        {remaining !== null ? <span className={styles.panelFooterCounter}>{remaining > 0 ? formatAttemptsLeft(remaining) : "Лимит AI-попыток исчерпан"}</span> : null}
      </footer>
    </div>
  );
};

type Props = {
  state: JoinSidePanelState;
  result: AiVariant | null;
  mode: AiJoinResultMode;
  availableModes: AiJoinResultMode[];
  historyIndex: number;
  historyCount: number;
  generationId: string;
  isPending: boolean;
  pendingAction: AiJoinAction | null;
  limitReached: boolean;
  issues: string[];
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
  onModeSelect: (mode: AiJoinResultMode) => void;
  onAnother: () => void;
  onAddDetail: (detail: string) => void;
  onPrevious: () => void;
  onNext: () => void;
  onRetry: () => void;
};

export const JoinSidePanel = ({
  state,
  result,
  mode,
  availableModes,
  historyIndex,
  historyCount,
  generationId,
  isPending,
  pendingAction,
  limitReached,
  issues,
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
  onModeSelect,
  onAnother,
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
                <p className={styles.hint}>Напишите мысли в поле поздравления. ИИ сохранит главное и соберёт один готовый текст.</p>
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
                      <span className={styles.promptIcon} aria-hidden="true">{hint.icon}</span>
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
            <footer className={styles.panelFooter}><p className={styles.panelFooterNote}><span aria-hidden="true">⏳</span> Обычно это занимает несколько секунд.</p></footer>
          </div>
        ) : null}

        {state === "error" ? (
          <div className={styles.panelState}>
            <div className={styles.sidePanelHead}>
              <span className={styles.sidePanelWand} aria-hidden="true" />
              <div>
                <h2 className={styles.sectionTitle}>Не получилось подготовить текст</h2>
                <p className={styles.hint}>Ваши мысли остались в поле. Попробуйте ещё раз через несколько секунд.</p>
              </div>
            </div>
            {issues.length > 0 ? <ul className={styles.panelErrorList}>{issues.map((issue) => <li key={issue}>{issue}</li>)}</ul> : null}
            <div><button type="button" className={styles.panelRetryButton} disabled={isPending} onClick={onRetry}>Повторить</button></div>
          </div>
        ) : null}

        {state === "result" && result ? (
          <JoinResult
            result={result}
            mode={mode}
            availableModes={availableModes}
            historyIndex={historyIndex}
            historyCount={historyCount}
            generationId={generationId}
            isPending={isPending}
            pendingAction={pendingAction}
            limitReached={limitReached}
            remaining={remaining}
            issues={issues}
            messageLimit={messageLimit}
            onUseResult={onUseResult}
            onModeSelect={onModeSelect}
            onAnother={onAnother}
            onAddDetail={onAddDetail}
            onPrevious={onPrevious}
            onNext={onNext}
          />
        ) : null}
      </section>
    </aside>
  );
};
