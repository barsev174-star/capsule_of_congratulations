"use client";
/* eslint-disable @next/next/no-img-element -- store-hosted previews are intentionally external. */

import { useEffect, useRef, useState, useTransition } from "react";
import { getDefaultPollQuestion, getDefaultPollTitle } from "@/lib/gift-polls/validation";
import styles from "./participant-page.module.css";

type Option = { id: string; title: string; description: string | null; imageUrl: string | null; priceLabel: string | null; productUrl: string | null };
type Poll = { id?: string; mode: "gift" | "budget"; title: string; question: string; closesAt?: string | null; options: Option[]; selectedOptionId?: string | null };
type View = "invite" | "form" | "skipped" | "voted" | "editing";

const price = (value: string | null) => value ? (/[₽р]\.?$/iu.test(value.trim()) ? `≈ ${value.trim()}` : `≈ ${value.trim()} ₽`) : null;
const titleCase = (value: string) => value ? `${value.charAt(0).toUpperCase()}${value.slice(1)}` : value;

export const GiftPollVote = ({ publicSlug, active, focusOnReveal = false, inviteToReveal = false }: { publicSlug: string; active: boolean; focusOnReveal?: boolean; inviteToReveal?: boolean }) => {
  const [poll, setPoll] = useState<Poll | null>(null);
  const [closed, setClosed] = useState<{ has_vote: boolean } | null>(null);
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  const [savedOptionId, setSavedOptionId] = useState<string | null>(null);
  const [view, setView] = useState<View>("form");
  const [revealed, setRevealed] = useState(false);
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();
  const sectionRef = useRef<HTMLElement>(null);
  const successRef = useRef<HTMLElement>(null);
  const skippedRef = useRef<HTMLElement>(null);
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
        if (active && !selected && inviteToReveal && window.localStorage.getItem(skipKey) !== "1") setView("invite");
      })
      .catch(() => undefined);
  }, [active, inviteToReveal, publicSlug, skipKey, storageKey]);

  useEffect(() => {
    if (active && focusOnReveal && !inviteToReveal && poll && view === "form") requestAnimationFrame(() => sectionRef.current?.focus({ preventScroll: false }));
  }, [active, focusOnReveal, inviteToReveal, poll, view]);
  useEffect(() => {
    if (view !== "form" || !revealed) return;
    const section = sectionRef.current;
    if (!section) return;
    requestAnimationFrame(() => {
      const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      section.scrollIntoView({ behavior: reducedMotion ? "auto" : "smooth", block: "start" });
      section.focus({ preventScroll: true });
    });
  }, [view, revealed]);
  useEffect(() => {
    if (view === "voted") requestAnimationFrame(() => successRef.current?.focus());
  }, [view]);
  useEffect(() => {
    if (view === "skipped") requestAnimationFrame(() => skippedRef.current?.focus());
  }, [view]);
  useEffect(() => {
    if (view === "editing" && selectedOptionId) requestAnimationFrame(() => document.getElementById(`gift-poll-option-${selectedOptionId}`)?.focus());
  }, [selectedOptionId, view]);

  if (!poll && closed) return <section className={styles.giftPollSuccess} aria-live="polite"><strong>{closed.has_vote ? "Голосование завершено" : "Поздравление добавлено"}</strong><p>{closed.has_vote ? "Ваш выбор был сохранён." : "Голосование за подарок уже завершено."}</p></section>;
  if (!poll || !active) return null;

  const selectedOption = poll.options.find((option) => option.id === (savedOptionId ?? selectedOptionId));
  const choose = (id: string) => { if (!isPending) { setSelectedOptionId(id); setError(""); } };
  const saveVote = () => {
    if (!selectedOptionId || isPending) return;
    const participantToken = window.localStorage.getItem(storageKey);
    if (!participantToken) return;
    startTransition(async () => {
      try {
        const response = await fetch(`/api/join/${publicSlug}/gift-poll`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ participantToken, optionId: selectedOptionId }) });
        if (!response.ok) { setError("Не удалось отправить голос. Ваш выбор сохранён — попробуйте ещё раз."); return; }
        window.localStorage.removeItem(skipKey);
        setSavedOptionId(selectedOptionId);
        setView("voted");
      } catch {
        setError("Не удалось отправить голос. Ваш выбор сохранён — попробуйте ещё раз.");
      }
    });
  };
  const skip = () => { if (!isPending) { window.localStorage.setItem(skipKey, "1"); setView("skipped"); } };
  const reveal = () => { setRevealed(true); setView("form"); };
  const handleOptionKeyDown = (event: React.KeyboardEvent<HTMLElement>, index: number) => {
    if (isPending) return;
    if (event.key === " " || event.key === "Enter") { event.preventDefault(); choose(poll.options[index].id); return; }
    if (!["ArrowDown", "ArrowRight", "ArrowUp", "ArrowLeft"].includes(event.key)) return;
    event.preventDefault();
    const direction = event.key === "ArrowDown" || event.key === "ArrowRight" ? 1 : -1;
    const nextIndex = (index + direction + poll.options.length) % poll.options.length;
    choose(poll.options[nextIndex].id);
    document.getElementById(`gift-poll-option-${poll.options[nextIndex].id}`)?.focus();
  };
  const isEditing = view === "editing";
  const pollTitle = poll.title.trim() || getDefaultPollTitle(poll.mode);
  const pollQuestion = poll.question.trim() || getDefaultPollQuestion(poll.mode);
  const hasBudgetExplanation = poll.mode === "budget" && poll.options.some((option) => Boolean(option.description?.trim()));

  if (view === "invite") return (
    <section className={styles.giftPollSuccess} aria-live="polite">
      <strong>Поздравление добавлено</strong>
      <p>Спасибо — ваши слова стали частью общей открытки. Теперь можно помочь выбрать подарок.</p>
      <div><button type="button" className={styles.giftPollInviteButton} aria-expanded={false} aria-controls="gift-poll-section" onClick={reveal}>Перейти к голосованию</button></div>
    </section>
  );

  if (view === "skipped") return <section ref={skippedRef} tabIndex={-1} className={styles.giftPollSkipped} aria-live="polite"><strong><span aria-hidden="true">✓</span> Поздравление добавлено</strong><p>Голосование пропущено <span aria-hidden="true">·</span> <button type="button" className={styles.giftPollTextButton} aria-expanded={false} aria-controls="gift-poll-section" onClick={() => { window.localStorage.removeItem(skipKey); setRevealed(true); setView("form"); }}>Вернуться</button></p></section>;

  if (view === "voted") return <section ref={successRef} tabIndex={-1} className={`${styles.giftPollSuccess} ${styles.giftPollVoteSuccess}`} aria-live="polite"><strong><span aria-hidden="true">✓</span> Голос учтён</strong>{selectedOption ? <div className={styles.giftPollChoiceRow}><p className={styles.giftPollChoice}>Ваш выбор: <b>{titleCase(selectedOption.title)}</b></p><button type="button" className={`${styles.giftPollTextButton} ${styles.giftPollChoiceEdit}`} onClick={() => setView("editing")}>Изменить</button></div> : null}<p className={styles.giftPollVotePrivacy}>Выбор увидит только организатор.</p></section>;

  return <>
    {revealed ? <section className={styles.giftPollCompactSuccess} aria-live="polite"><strong><span aria-hidden="true">✓</span> Поздравление добавлено</strong><p>Спасибо — ваши слова стали частью общей открытки.</p></section> : null}
    <section ref={sectionRef} id="gift-poll-section" tabIndex={-1} className={styles.giftPollCard} aria-labelledby="gift-poll-title">
    <p className={styles.giftPollEyebrow}>НЕОБЯЗАТЕЛЬНЫЙ ШАГ</p>
    <h2 id="gift-poll-title" className={styles.sectionTitle}>{pollTitle}</h2>
    <p className={styles.hint}>{pollQuestion}</p>
    <p className={styles.giftPollPrivacy}>Ваш выбор увидит только организатор. Результаты другим участникам не показываем.</p>
    <fieldset className={styles.giftPollFieldset} disabled={isPending}>
      <legend className={styles.srOnly}>{pollQuestion}</legend>
      <div className={styles.giftPollOptions} data-count={poll.options.length} data-compact={poll.mode === "budget" && !hasBudgetExplanation ? "true" : undefined} role="radiogroup" aria-label={pollQuestion}>{poll.options.map((option, index) => <article key={option.id} id={`gift-poll-option-${option.id}`} tabIndex={selectedOptionId === option.id ? 0 : -1} role="radio" aria-checked={selectedOptionId === option.id} aria-disabled={isPending || undefined} className={`${styles.giftPollOption} ${poll.mode === "budget" ? styles.giftPollBudgetOption : ""} ${selectedOptionId === option.id ? styles.giftPollOptionSelected : ""}`} onClick={() => choose(option.id)} onKeyDown={(event) => handleOptionKeyDown(event, index)}>{option.imageUrl ? <img src={option.imageUrl} alt="" className={styles.giftPollOptionImage} /> : null}<span className={styles.giftPollOptionCopy}><strong>{titleCase(option.title)}</strong>{option.description && option.description.trim().toLowerCase() !== option.title.trim().toLowerCase() ? <span>{option.description}</span> : null}{price(option.priceLabel) ? <em>{price(option.priceLabel)}</em> : null}{option.productUrl ? <a href={option.productUrl} target="_blank" rel="noopener noreferrer" aria-label={`Открыть вариант «${option.title}» в новой вкладке`} onClick={(event) => event.stopPropagation()}>Посмотреть вариант →</a> : null}</span><span className={styles.giftPollRadio} aria-hidden="true" /></article>)}</div>
    </fieldset>
    {error ? <div className={styles.giftPollError} role="alert"><p>{error}</p></div> : null}
    <div className={styles.giftPollActions}><button type="button" className={styles.submitButton} disabled={!selectedOptionId || isPending} onClick={saveVote}>{isPending ? "Отправляем голос…" : error ? "Повторить" : isEditing ? "Сохранить выбор" : "Отдать голос"}</button>{!isEditing ? <button type="button" className={styles.giftPollTextButton} disabled={isPending} onClick={skip}>Пропустить сейчас</button> : null}</div>
    </section>
  </>;
};
