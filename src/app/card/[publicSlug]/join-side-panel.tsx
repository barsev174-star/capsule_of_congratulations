"use client";

import { useState } from "react";
import type { AiVariant } from "@/lib/ai/types";
import { GREETING_HINTS, type GreetingHint, type GreetingHintId } from "./greeting-hints";
import styles from "./participant-page.module.css";

export type JoinSidePanelState = "idle" | "loading" | "variants" | "error";

const LOADING_STEPS = ["Аккуратно", "Теплее", "Живее"];

const hintAriaLabel = (hint: GreetingHint) =>
  `Показать пример: ${hint.title.charAt(0).toLowerCase()}${hint.title.slice(1).replace(/\?$/, "")}`;

const formatGenerationsLeft = (count: number) => {
  const mod10 = count % 10;
  const mod100 = count % 100;

  if (mod10 === 1 && mod100 !== 11) {
    return `Осталась ${count} генерация`;
  }

  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) {
    return `Осталось ${count} генерации`;
  }

  return `Осталось ${count} генераций`;
};

type VariantsProps = {
  variants: AiVariant[];
  generationId: string;
  isPending: boolean;
  limitReached: boolean;
  remaining: number | null;
  onUseVariant: (text: string) => void;
  onRetry: () => void;
};

const JoinVariants = ({
  variants,
  generationId,
  isPending,
  limitReached,
  remaining,
  onUseVariant,
  onRetry
}: VariantsProps) => {
  const [activeVariantIndex, setActiveVariantIndex] = useState(0);
  const [collapsed, setCollapsed] = useState(false);
  const [inserted, setInserted] = useState(false);
  const activeVariant = variants[activeVariantIndex] ?? variants[0];

  if (!activeVariant) {
    return null;
  }

  const panelId = `join-ai-variants-${generationId || "result"}`;
  const tabId = (index: number) => `${panelId}-tab-${index}`;

  const applyVariant = (text: string) => {
    onUseVariant(text);
    setInserted(true);
    if (window.matchMedia("(max-width: 959px)").matches) {
      setCollapsed(true);
    }
  };

  if (collapsed) {
    return (
      <div className={styles.variantCollapsedRow}>
        <span>Вариант вставлен</span>
        <button type="button" className={styles.variantCollapsedButton} onClick={() => setCollapsed(false)}>
          Показать остальные
        </button>
      </div>
    );
  }

  return (
    <div className={styles.panelState}>
      <h2 className={styles.sectionTitle}>Выберите вариант</h2>
      <div className={`${styles.variants} ${styles.sidePanelVariants}`}>
        <div className={styles.variantTabs} role="tablist" aria-label="Варианты поздравления">
          {variants.map((item, index) => (
            <button
              key={item.id}
              type="button"
              role="tab"
              id={tabId(index)}
              aria-selected={index === activeVariantIndex}
              aria-controls={panelId}
              className={`${styles.variantTab} ${index === activeVariantIndex ? styles.variantTabActive : ""}`}
              onClick={() => setActiveVariantIndex(index)}
            >
              {item.label}
            </button>
          ))}
        </div>
        <article
          className={styles.variantCard}
          role="tabpanel"
          id={panelId}
          aria-labelledby={tabId(activeVariantIndex)}
        >
          <div key={activeVariant.id} className={styles.variantCardContent}>
            <p className={styles.message}>{activeVariant.text}</p>
          </div>
          <div className={styles.variantActions}>
            <button type="button" className={styles.useButton} onClick={() => applyVariant(activeVariant.text)}>
              Использовать вариант
            </button>
            <button type="button" className={styles.retryButton} disabled={isPending || limitReached} onClick={onRetry}>
              Получить ещё
            </button>
          </div>
        </article>
      </div>
      <footer className={styles.panelFooter}>
        <p className={styles.panelFooterNote}>
          {inserted
            ? "Выбранный текст уже добавлен в поле слева. Его можно свободно отредактировать перед отправкой."
            : "Текст не отправится автоматически. После выбора его можно отредактировать слева."}
        </p>
        {remaining !== null ? (
          <span className={styles.panelFooterCounter}>
            {remaining > 0 ? formatGenerationsLeft(remaining) : "Лимит AI-вариантов исчерпан"}
          </span>
        ) : null}
      </footer>
    </div>
  );
};

type Props = {
  state: JoinSidePanelState;
  variants: AiVariant[];
  generationId: string;
  isPending: boolean;
  limitReached: boolean;
  issues: string[];
  remaining: number | null;
  activeHintId: GreetingHintId | null;
  activeHintExample: string | null;
  hintExampleVisible: boolean;
  exampleBlockId: string;
  onHintSelect: (hint: GreetingHint) => void;
  onHideHintExample: () => void;
  onUseVariant: (text: string) => void;
  onRetry: () => void;
};

export const JoinSidePanel = ({
  state,
  variants,
  generationId,
  isPending,
  limitReached,
  issues,
  remaining,
  activeHintId,
  activeHintExample,
  hintExampleVisible,
  exampleBlockId,
  onHintSelect,
  onHideHintExample,
  onUseVariant,
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
                <p className={styles.hint}>
                  Напишите мысли в поле поздравления. ИИ сохранит главное и предложит три варианта в лимите открытки.
                </p>
              </div>
            </div>

            <button
              type="button"
              className={styles.promptsToggle}
              aria-expanded={promptsOpen}
              onClick={() => setPromptsOpen((current) => !current)}
            >
              <span>Не знаете, с чего начать?</span>
              <span className={`${styles.promptsToggleIcon} ${promptsOpen ? styles.promptsToggleIconOpen : ""}`} aria-hidden="true" />
            </button>

            <ul className={`${styles.promptList} ${promptsOpen ? styles.promptListOpen : ""}`}>
              {GREETING_HINTS.map((hint) => {
                const isActive = hint.id === activeHintId;
                return (
                  <li key={hint.id}>
                    <button
                      type="button"
                      className={`${styles.promptButton} ${isActive ? styles.promptButtonActive : ""}`}
                      aria-pressed={isActive}
                      aria-controls={exampleBlockId}
                      aria-label={hintAriaLabel(hint)}
                      onClick={() => onHintSelect(hint)}
                    >
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
                  <button
                    type="button"
                    className={styles.panelExampleHide}
                    aria-label="Скрыть пример"
                    onClick={onHideHintExample}
                  >
                    ×
                  </button>
                </div>
                <p key={activeHintExample} className={styles.panelExampleText}>
                  {activeHintExample}
                </p>
                <span className={styles.panelExampleNote}>
                  Нажмите на подсказку ещё раз, чтобы увидеть другой пример.
                </span>
              </div>
            ) : null}

            <footer className={styles.panelFooter}>
              <p className={styles.panelFooterNote}>
                Пример не вставляется автоматически — напишите мысль своими словами.
              </p>
              <p className={styles.privacyLock}>
                <span aria-hidden="true">🔒</span>
                Черновик и варианты хранятся только до отправки.
              </p>
            </footer>
          </div>
        ) : null}

        {state === "loading" ? (
          <div className={styles.panelState} role="status">
            <div className={styles.sidePanelHead}>
              <span className={styles.sidePanelWand} aria-hidden="true" />
              <div>
                <h2 className={styles.sectionTitle}>Готовим три варианта</h2>
                <p className={styles.hint}>Сохраняем ваши мысли и укладываем текст в формат открытки.</p>
              </div>
            </div>
            <span className={styles.loadingTrack} aria-hidden="true">
              <span className={styles.loadingLine} />
            </span>
            <ul className={styles.loadingSkeletons} aria-hidden="true">
              {LOADING_STEPS.map((label, index) => (
                <li key={label} className={styles.loadingSkeleton} style={{ animationDelay: `${index * 180}ms` }}>
                  <span className={styles.loadingSkeletonLabel}>{label}</span>
                  <span className={styles.loadingSkeletonBar} />
                  <span className={`${styles.loadingSkeletonBar} ${styles.loadingSkeletonBarShort}`} />
                </li>
              ))}
            </ul>
            <footer className={styles.panelFooter}>
              <p className={styles.panelFooterNote}>
                <span aria-hidden="true">⏳</span> Обычно это занимает несколько секунд.
              </p>
            </footer>
          </div>
        ) : null}

        {state === "error" ? (
          <div className={styles.panelState}>
            <div className={styles.sidePanelHead}>
              <span className={styles.sidePanelWand} aria-hidden="true" />
              <div>
                <h2 className={styles.sectionTitle}>Не получилось подготовить варианты</h2>
                <p className={styles.hint}>
                  Ваш текст остался в поле. Попробуйте ещё раз через несколько секунд.
                </p>
              </div>
            </div>
            {issues.length > 0 ? (
              <ul className={styles.panelErrorList}>
                {issues.map((issue) => (
                  <li key={issue}>{issue}</li>
                ))}
              </ul>
            ) : null}
            <div>
              <button type="button" className={styles.panelRetryButton} disabled={isPending} onClick={onRetry}>
                Повторить
              </button>
            </div>
          </div>
        ) : null}

        {state === "variants" ? (
          <JoinVariants
            key={generationId}
            variants={variants}
            generationId={generationId}
            isPending={isPending}
            limitReached={limitReached}
            remaining={remaining}
            onUseVariant={onUseVariant}
            onRetry={onRetry}
          />
        ) : null}
      </section>
    </aside>
  );
};
