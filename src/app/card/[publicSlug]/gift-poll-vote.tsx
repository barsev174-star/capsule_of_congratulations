"use client";
/* eslint-disable @next/next/no-img-element -- store-hosted previews are intentionally external. */

import { useEffect, useRef, useState, useTransition } from "react";
import styles from "./participant-page.module.css";

type Option = { id: string; title: string; description: string | null; imageUrl: string | null; priceLabel: string | null; productUrl: string | null };
type Poll = { id?: string; mode: "gift" | "budget"; title: string; question: string; closesAt?: string | null; options: Option[]; selectedOptionId?: string | null };
type View = "form" | "skipped" | "voted" | "editing";

const price = (value: string | null) => value ? (/[₽р]\.?$/iu.test(value.trim()) ? `≈ ${value.trim()}` : `≈ ${value.trim()} ₽`) : null;
const titleCase = (value: string) => value ? `${value.charAt(0).toUpperCase()}${value.slice(1)}` : value;
const deadline = (value: string | null | undefined) => value ? new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "long" }).format(new Date(value)) : null;

export const GiftPollVote = ({ publicSlug, active, focusOnReveal = false }: { publicSlug: string; active: boolean; focusOnReveal?: boolean }) => {
  const [poll, setPoll] = useState<Poll | null>(null);
  const [closed, setClosed] = useState<{ has_vote: boolean } | null>(null);
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  const [savedOptionId, setSavedOptionId] = useState<string | null>(null);
  const [view, setView] = useState<View>("form");
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();
  const sectionRef = useRef<HTMLElement>(null);
  const successRef = useRef<HTMLElement>(null);
  const storageKey = `participant-submission-${publicSlug}`;
  const skipKey = `participant-gift-poll-skip-${publicSlug}`;

  useEffect(() => {
    const token = window.localStorage.getItem(storageKey);
    const headers = token ? { "x-participant-token": token } : undefined;
    void fetch(`/api/join/${publicSlug}/gift-poll`, { headers })
      .then((response) => response.ok ? response.json() : null)
      .then((payload: { poll?: Poll | null; teaser?: Poll | null; closed?: { has_vote: boolean } | null } | null) => {
        const nextPoll = active ? payload?.poll ?? null : payload?.teaser ?? null;
        setPoll(nextPoll);
        setClosed(active ? payload?.closed ?? null : null);
        const selected = nextPoll?.selectedOptionId ?? null;
        setSelectedOptionId(selected);
        setSavedOptionId(selected);
        if (active && selected) setView("voted");
        if (active && !selected && window.localStorage.getItem(skipKey) === "1") setView("skipped");
      });
  }, [active, publicSlug, skipKey, storageKey]);

  useEffect(() => {
    if (active && focusOnReveal && poll && view === "form") requestAnimationFrame(() => sectionRef.current?.focus({ preventScroll: false }));
  }, [active, focusOnReveal, poll, view]);
  useEffect(() => {
    if (view === "voted") requestAnimationFrame(() => successRef.current?.focus());
  }, [view]);

  if (!poll && closed) return <section className={styles.giftPollSuccess} aria-live="polite"><strong>{closed.has_vote ? "Голосование завершено" : "Поздравление добавлено"}</strong><p>{closed.has_vote ? "Ваш выбор был сохранён." : "Голосование за подарок уже завершено."}</p></section>;
  if (!poll) return null;

  const selectedOption = poll.options.find((option) => option.id === (savedOptionId ?? selectedOptionId));
  const choose = (id: string) => { setSelectedOptionId(id); setError(""); };
  const saveVote = () => {
    if (!selectedOptionId) return;
    const participantToken = window.localStorage.getItem(storageKey);
    if (!participantToken) return;
    startTransition(async () => {
      const response = await fetch(`/api/join/${publicSlug}/gift-poll`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ participantToken, optionId: selectedOptionId }) });
      if (!response.ok) { setError("Не удалось сохранить голос. Проверьте соединение и попробуйте ещё раз."); return; }
      window.localStorage.removeItem(skipKey);
      setSavedOptionId(selectedOptionId);
      setView("voted");
    });
  };
  const skip = () => { window.localStorage.setItem(skipKey, "1"); setView("skipped"); };
  const isEditing = view === "editing";

  if (!active) return <section className={styles.giftPollTeaser} aria-label="Голосование за подарок"><p className={styles.giftPollEyebrow}>ЕЩЁ ОДИН НЕОБЯЗАТЕЛЬНЫЙ ШАГ</p><h2 className={styles.sectionTitle}>После поздравления можно помочь выбрать {poll.mode === "budget" ? "бюджет" : "подарок"}</h2><p className={styles.hint}>Организатор добавил несколько вариантов. Ваш выбор увидит только он.</p><div className={styles.giftPollTeaserOptions} aria-hidden="true">{poll.options.map((option) => <span key={option.id}>{option.imageUrl ? <img src={option.imageUrl} alt="" /> : null}<b>{titleCase(option.title)}</b></span>)}</div></section>;

  if (view === "skipped") return <section className={styles.giftPollSuccess} aria-live="polite"><strong>Поздравление добавлено</strong><p>Вы пропустили выбор {poll.mode === "budget" ? "бюджета" : "подарка"}.</p><button type="button" className={styles.giftPollSecondaryButton} onClick={() => { window.localStorage.removeItem(skipKey); setView("form"); }}>Помочь выбрать {poll.mode === "budget" ? "бюджет" : "подарок"}</button></section>;

  if (view === "voted") return <section ref={successRef} tabIndex={-1} className={styles.giftPollSuccess} aria-live="polite"><strong>Голос учтён</strong><p>Спасибо — ваш выбор увидит организатор открытки.</p>{selectedOption ? <article className={styles.giftPollSelectedSummary}>{selectedOption.imageUrl ? <img src={selectedOption.imageUrl} alt="" /> : null}<div><b>{titleCase(selectedOption.title)}</b>{price(selectedOption.priceLabel) ? <em>{price(selectedOption.priceLabel)}</em> : null}{selectedOption.productUrl ? <a href={selectedOption.productUrl} target="_blank" rel="noopener noreferrer" aria-label={`Открыть вариант «${selectedOption.title}» в новой вкладке`}>Посмотреть вариант →</a> : null}</div></article> : null}<p className={styles.giftPollChangeHint}>{deadline(poll.closesAt) ? `До ${deadline(poll.closesAt)} вы сможете изменить свой выбор.` : "Вы сможете изменить выбор, пока голосование открыто."}</p><button type="button" className={styles.giftPollSecondaryButton} onClick={() => setView("editing")}>Изменить выбор</button></section>;

  return <section ref={sectionRef} tabIndex={-1} className={styles.giftPollCard} aria-labelledby="gift-poll-title"><p className={styles.giftPollEyebrow}>НЕОБЯЗАТЕЛЬНЫЙ ШАГ</p><h2 id="gift-poll-title" className={styles.sectionTitle}>Помогите выбрать {poll.mode === "budget" ? "бюджет" : "подарок"}</h2><p className={styles.hint}>{poll.question}</p><p className={styles.giftPollPrivacy}>Ваш выбор увидит только организатор. Результаты другим участникам не показываем.</p><div className={styles.giftPollOptions} role="radiogroup" aria-label={poll.question}>{poll.options.map((option) => <button key={option.id} type="button" role="radio" aria-checked={selectedOptionId === option.id} className={`${styles.giftPollOption} ${poll.mode === "budget" ? styles.giftPollBudgetOption : ""} ${selectedOptionId === option.id ? styles.giftPollOptionSelected : ""}`} onClick={() => choose(option.id)}>{option.imageUrl ? <img src={option.imageUrl} alt="" className={styles.giftPollOptionImage} /> : null}<span className={styles.giftPollOptionCopy}>{poll.mode === "budget" ? <span className={styles.giftPollBudgetLabel}>Общий бюджет</span> : null}<strong>{titleCase(option.title)}</strong>{option.description && option.description.trim().toLowerCase() !== option.title.trim().toLowerCase() ? <span>{option.description}</span> : null}{price(option.priceLabel) ? <em>{price(option.priceLabel)}</em> : null}{option.productUrl ? <a href={option.productUrl} target="_blank" rel="noopener noreferrer" aria-label={`Открыть вариант «${option.title}» в новой вкладке`} onClick={(event) => event.stopPropagation()}>Посмотреть вариант →</a> : null}</span><span className={styles.giftPollRadio} aria-hidden="true" /></button>)}</div>{error ? <div className={styles.giftPollError} role="alert"><p>{error}</p></div> : null}<div className={styles.giftPollActions}><button type="button" className={styles.submitButton} disabled={!selectedOptionId || isPending} onClick={saveVote}>{isPending ? "Сохраняем выбор…" : error ? "Попробовать снова" : isEditing ? "Сохранить выбор" : "Отдать голос"}</button>{!isEditing ? <button type="button" className={styles.giftPollSecondaryButton} onClick={skip}>Пропустить сейчас</button> : null}</div></section>;
};
