"use client";
/* eslint-disable @next/next/no-img-element -- store-hosted previews are intentionally external. */

import { useState, useTransition } from "react";
import styles from "./participant-page.module.css";

export type JoinPollOption = {
  id: string;
  title: string;
  description: string | null;
  imageUrl: string | null;
  priceLabel: string | null;
  productUrl: string | null;
};

export type JoinPoll = {
  mode: "gift" | "budget";
  title: string;
  question: string;
  options: JoinPollOption[];
};

const price = (value: string | null) =>
  value ? (/[₽р]\.?$/iu.test(value.trim()) ? `≈ ${value.trim()}` : `≈ ${value.trim()} ₽`) : null;

const titleCase = (value: string) => (value ? `${value.charAt(0).toUpperCase()}${value.slice(1)}` : value);

const getParticipantToken = (publicSlug: string) => {
  const storageKey = `participant-submission-${publicSlug}`;
  const existing = window.localStorage.getItem(storageKey);
  if (existing) {
    return existing;
  }
  const created = window.crypto.randomUUID();
  window.localStorage.setItem(storageKey, created);
  return created;
};

type TeaserViewProps = {
  poll: JoinPoll;
  onOpenVoting: () => void;
};

export const JoinPollTeaserView = ({ poll, onOpenVoting }: TeaserViewProps) => (
  <div className={styles.panelState}>
    <div className={styles.sidePanelHead}>
      <span className={styles.sidePanelWand} aria-hidden="true" />
      <div>
        <p className={styles.giftPollEyebrow}>Опрос от организатора</p>
        <h2 className={styles.sectionTitle}>{poll.title}</h2>
        <p className={styles.hint}>{poll.question}</p>
      </div>
    </div>

    <div className={styles.giftPollTeaserOptions} aria-hidden="true">
      {poll.options.map((option) => (
        <span key={option.id}>
          {option.imageUrl ? <img src={option.imageUrl} alt="" /> : null}
          <b>{titleCase(option.title)}</b>
        </span>
      ))}
    </div>

    <div>
      <button type="button" className={styles.panelRetryButton} onClick={onOpenVoting}>
        Перейти к голосованию
      </button>
    </div>

    <footer className={styles.panelFooter}>
      <p className={styles.panelFooterNote}>
        Ваш выбор увидит только организатор. Результаты другим участникам не показываем.
      </p>
    </footer>
  </div>
);

type VotingFormProps = {
  publicSlug: string;
  poll: JoinPoll;
  onVoted: (optionId: string) => void;
  onCancel?: () => void;
};

export const JoinPollVotingForm = ({ publicSlug, poll, onVoted, onCancel }: VotingFormProps) => {
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  const saveVote = () => {
    if (!selectedOptionId) {
      return;
    }
    const participantToken = getParticipantToken(publicSlug);
    startTransition(async () => {
      const response = await fetch(`/api/join/${publicSlug}/gift-poll`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ participantToken, optionId: selectedOptionId })
      });
      if (!response.ok) {
        setError("Не удалось сохранить голос. Проверьте соединение и попробуйте ещё раз.");
        return;
      }
      onVoted(selectedOptionId);
    });
  };

  return (
    <div className={styles.panelState}>
      <div>
        <h2 className={styles.sectionTitle}>Помогите выбрать {poll.mode === "budget" ? "бюджет" : "подарок"}</h2>
        <p className={styles.hint}>{poll.question}</p>
      </div>

      <div className={styles.giftPollOptions} role="radiogroup" aria-label={poll.question}>
        {poll.options.map((option) => (
          <button
            key={option.id}
            type="button"
            role="radio"
            aria-checked={selectedOptionId === option.id}
            className={`${styles.giftPollOption} ${poll.mode === "budget" ? styles.giftPollBudgetOption : ""} ${
              selectedOptionId === option.id ? styles.giftPollOptionSelected : ""
            }`}
            onClick={() => {
              setSelectedOptionId(option.id);
              setError("");
            }}
          >
            {option.imageUrl ? <img src={option.imageUrl} alt="" className={styles.giftPollOptionImage} /> : null}
            <span className={styles.giftPollOptionCopy}>
              {poll.mode === "budget" ? <span className={styles.giftPollBudgetLabel}>Общий бюджет</span> : null}
              <strong>{titleCase(option.title)}</strong>
              {option.description && option.description.trim().toLowerCase() !== option.title.trim().toLowerCase() ? (
                <span>{option.description}</span>
              ) : null}
              {price(option.priceLabel) ? <em>{price(option.priceLabel)}</em> : null}
              {option.productUrl ? (
                <a
                  href={option.productUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`Открыть вариант «${option.title}» в новой вкладке`}
                  onClick={(event) => event.stopPropagation()}
                >
                  Посмотреть вариант →
                </a>
              ) : null}
            </span>
            <span className={styles.giftPollRadio} aria-hidden="true" />
          </button>
        ))}
      </div>

      {error ? (
        <div className={styles.giftPollError} role="alert">
          <p>{error}</p>
        </div>
      ) : null}

      <div className={styles.giftPollActions}>
        <button type="button" className={styles.submitButton} disabled={!selectedOptionId || isPending} onClick={saveVote}>
          {isPending ? "Сохраняем выбор…" : error ? "Попробовать ещё раз" : "Учесть мой выбор"}
        </button>
        {onCancel ? (
          <button type="button" className={styles.giftPollSecondaryButton} onClick={onCancel}>
            Назад
          </button>
        ) : null}
      </div>
    </div>
  );
};

type VotedViewProps = {
  poll: JoinPoll;
  optionId: string;
  onChangeVote: () => void;
};

export const JoinPollVotedView = ({ poll, optionId, onChangeVote }: VotedViewProps) => {
  const selectedOption = poll.options.find((option) => option.id === optionId) ?? null;

  return (
    <div className={styles.panelState}>
      <div className={styles.sidePanelHead}>
        <span className={styles.sidePanelWand} aria-hidden="true" />
        <div>
          <h2 className={styles.sectionTitle}>Голос учтён</h2>
          <p className={styles.hint}>Спасибо — ваш выбор увидит только организатор открытки.</p>
        </div>
      </div>

      {selectedOption ? (
        <article className={styles.giftPollSelectedSummary}>
          {selectedOption.imageUrl ? <img src={selectedOption.imageUrl} alt="" /> : null}
          <div>
            <b>{titleCase(selectedOption.title)}</b>
            {price(selectedOption.priceLabel) ? <em>{price(selectedOption.priceLabel)}</em> : null}
          </div>
        </article>
      ) : null}

      <div>
        <button type="button" className={styles.giftPollSecondaryButton} onClick={onChangeVote}>
          Изменить выбор
        </button>
      </div>

      <footer className={styles.panelFooter}>
        <p className={styles.panelFooterNote}>Вы сможете изменить выбор, пока голосование открыто.</p>
      </footer>
    </div>
  );
};

type SheetProps = {
  publicSlug: string;
  poll: JoinPoll;
  onVoted: (optionId: string) => void;
  onClose: () => void;
};

export const JoinPollSheet = ({ publicSlug, poll, onVoted, onClose }: SheetProps) => (
  <div
    className={styles.pollSheetOverlay}
    role="presentation"
    onClick={(event) => {
      if (event.target === event.currentTarget) {
        onClose();
      }
    }}
    onKeyDown={(event) => {
      if (event.key === "Escape") {
        onClose();
      }
    }}
  >
    <div className={styles.pollSheet} role="dialog" aria-modal="true" aria-label={poll.title}>
      <div className={styles.pollSheetHead}>
        <span className={styles.pollSheetGrip} aria-hidden="true" />
        <button type="button" className={styles.panelExampleHide} aria-label="Закрыть голосование" onClick={onClose}>
          ×
        </button>
      </div>
      <JoinPollVotingForm publicSlug={publicSlug} poll={poll} onVoted={onVoted} />
    </div>
  </div>
);
