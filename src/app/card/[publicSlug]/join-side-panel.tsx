"use client";

import { useState } from "react";
import type { AiVariant } from "@/lib/ai/types";
import styles from "./participant-page.module.css";

type VariantsProps = {
  variants: AiVariant[];
  isPending: boolean;
  limitReached: boolean;
  insertFeedback: string;
  onUseVariant: (text: string) => void;
  onRetry: () => void;
};

const JoinVariants = ({ variants, isPending, limitReached, insertFeedback, onUseVariant, onRetry }: VariantsProps) => {
  const [activeVariantIndex, setActiveVariantIndex] = useState(0);
  const activeVariant = variants[activeVariantIndex] ?? variants[0];

  if (!activeVariant) {
    return null;
  }

  return (
    <div className={`${styles.variants} ${styles.sidePanelVariants}`}>
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
          <button type="button" className={styles.useButton} onClick={() => onUseVariant(activeVariant.text)}>
            Использовать этот вариант
          </button>
          <button type="button" className={styles.retryButton} disabled={isPending || limitReached} onClick={onRetry}>
            Попробовать ещё
          </button>
        </div>
        {insertFeedback ? <p className={styles.insertFeedback} aria-live="polite">{insertFeedback}</p> : null}
      </article>
    </div>
  );
};

type Props = VariantsProps & {
  generationId: string;
  issues: string[];
  remaining: number | null;
};

export const JoinSidePanel = ({
  variants,
  generationId,
  isPending,
  limitReached,
  insertFeedback,
  issues,
  remaining,
  onUseVariant,
  onRetry
}: Props) => {
  const hasVariants = variants.length > 0;

  return (
    <aside className={styles.sidePanel} aria-label="AI-помощник поздравления">
      <section className={`${styles.aiCard} ${styles.joinAiCard} ${styles.sidePanelCard}`} aria-live="polite">
        <div className={styles.sidePanelHead}>
          <span className={styles.sidePanelWand} aria-hidden="true" />
          <div>
            <h2 className={styles.sectionTitle}>{hasVariants ? "Варианты от AI" : "Помощь с текстом"}</h2>
            <p className={styles.hint}>
              {hasVariants
                ? "Выберите вариант — он подставится в поле поздравления, и его можно будет поправить перед отправкой."
                : "Напишите мысли своими словами в поле поздравления и нажмите «Помочь с текстом» — здесь появятся три варианта: аккуратно, теплее и живее. Черновик останется на месте."}
            </p>
          </div>
        </div>

        {issues.length > 0 ? (
          <div className={styles.errorBox} role="alert">
            <ul className={styles.errorList}>
              {issues.map((issue) => (
                <li key={issue}>{issue}</li>
              ))}
            </ul>
          </div>
        ) : null}

        {hasVariants ? (
          <JoinVariants
            key={generationId}
            variants={variants}
            isPending={isPending}
            limitReached={limitReached}
            insertFeedback={insertFeedback}
            onUseVariant={onUseVariant}
            onRetry={onRetry}
          />
        ) : isPending ? (
          <p className={styles.sidePanelPending}>Готовим варианты — обычно это занимает несколько секунд…</p>
        ) : null}

        {remaining !== null ? (
          <span className={styles.note}>
            {remaining > 0 ? `Можно попробовать ещё ${remaining} раз` : "Лимит AI-вариантов исчерпан"}
          </span>
        ) : null}

        <p className={styles.privacyNote}>Черновик и варианты хранятся только до отправки поздравления.</p>
      </section>
    </aside>
  );
};
