"use client";

import { useState } from "react";
import type { AiVariant } from "@/lib/ai/types";
import styles from "./participant-page.module.css";

export type JoinSidePanelState = "idle" | "loading" | "variants";

const PROMPTS = [
  {
    icon: "💛",
    question: "За что хочется поблагодарить?",
    placeholder: "Например: спасибо, что всегда поддерживаешь и веришь в меня…"
  },
  {
    icon: "✨",
    question: "Что особенно цените?",
    placeholder: "Например: ценю твою искренность, чувство юмора и умение слушать…"
  },
  {
    icon: "💫",
    question: "Какой момент запомнился?",
    placeholder: "Например: помню, как мы вместе…"
  },
  {
    icon: "🎈",
    question: "Что хочется пожелать?",
    placeholder: "Например: желаю побольше радостных дней, тепла и вдохновения…"
  }
];

type VariantsProps = {
  variants: AiVariant[];
  generationId: string;
  isPending: boolean;
  limitReached: boolean;
  onUseVariant: (text: string) => void;
  onRetry: () => void;
};

const JoinVariants = ({ variants, generationId, isPending, limitReached, onUseVariant, onRetry }: VariantsProps) => {
  const [activeVariantIndex, setActiveVariantIndex] = useState(0);
  const [collapsed, setCollapsed] = useState(false);
  const activeVariant = variants[activeVariantIndex] ?? variants[0];

  if (!activeVariant) {
    return null;
  }

  const panelId = `join-ai-variants-${generationId || "result"}`;
  const tabId = (index: number) => `${panelId}-tab-${index}`;

  const applyVariant = (text: string) => {
    onUseVariant(text);
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
          <h3 className={styles.variantTitle}>{activeVariant.label}</h3>
          <p className={styles.message}>{activeVariant.text}</p>
          <div className={styles.variantActions}>
            <button type="button" className={styles.useButton} onClick={() => applyVariant(activeVariant.text)}>
              Использовать вариант
            </button>
            <button type="button" className={styles.retryButton} disabled={isPending || limitReached} onClick={onRetry}>
              Получить ещё варианты
            </button>
          </div>
        </article>
      </div>
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
  onPromptSelect: (placeholder: string) => void;
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
  onPromptSelect,
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
              {PROMPTS.map((prompt) => (
                <li key={prompt.question}>
                  <button type="button" className={styles.promptButton} onClick={() => onPromptSelect(prompt.placeholder)}>
                    <span className={styles.promptIcon} aria-hidden="true">{prompt.icon}</span>
                    <span>{prompt.question}</span>
                  </button>
                </li>
              ))}
            </ul>

            <p className={styles.privacyLock}>
              <span aria-hidden="true">🔒</span>
              Черновик и варианты хранятся только до отправки.
            </p>
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
            <span className={styles.loadingDots} aria-hidden="true">
              <span />
              <span />
              <span />
            </span>
          </div>
        ) : null}

        {state === "variants" ? (
          <JoinVariants
            key={generationId}
            variants={variants}
            generationId={generationId}
            isPending={isPending}
            limitReached={limitReached}
            onUseVariant={onUseVariant}
            onRetry={onRetry}
          />
        ) : null}

        {issues.length > 0 ? (
          <div className={styles.errorBox} role="alert">
            <ul className={styles.errorList}>
              {issues.map((issue) => (
                <li key={issue}>{issue}</li>
              ))}
            </ul>
          </div>
        ) : null}

        {remaining !== null && state !== "loading" ? (
          <span className={styles.note}>
            {remaining > 0 ? `Можно попробовать ещё ${remaining} раз` : "Лимит AI-вариантов исчерпан"}
          </span>
        ) : null}
      </section>
    </aside>
  );
};
