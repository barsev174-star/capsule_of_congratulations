"use client";

/* eslint-disable @next/next/no-img-element */

import { useActionState, useCallback, useEffect, useRef, useState } from "react";
import type { GiftPollWithOptions } from "@/lib/gift-polls/types";
import { defaultGiftPollCopy } from "@/lib/gift-polls/validation";
import { closeGiftPollAction, openGiftPollAction, reopenGiftPollAction, saveGiftPollAction, selectGiftPollOptionAction, type GiftPollFormState } from "./actions";
import styles from "./manage-page.module.css";

type Mode = "gift" | "budget";
type EditableOption = { id: string; title: string; description: string; imageUrl: string; priceLabel: string; productUrl: string };
const emptyOption = (): EditableOption => ({ id: crypto.randomUUID(), title: "", description: "", imageUrl: "", priceLabel: "", productUrl: "" });
const initialState: GiftPollFormState = { ok: false, message: "" };
const budgetInputValue = (title: string) => title.replace(/\D/g, "");
const toDateTimeLocal = (value: string | null | undefined) => value ? new Date(value).toISOString().slice(0, 16) : "";
const formatDate = (value: string | null) => value ? new Intl.DateTimeFormat("ru-RU", { dateStyle: "long", timeStyle: "short" }).format(new Date(value)) : "вручную";
const pluralVotes = (count: number) => `${count} ${count % 10 === 1 && count % 100 !== 11 ? "голос" : count % 10 >= 2 && count % 10 <= 4 && (count % 100 < 10 || count % 100 >= 20) ? "голоса" : "голосов"}`;
const productSource = (url: string) => {
  try { return new URL(url).hostname.replace(/^www\./, ""); } catch { return "ссылка на товар"; }
};
const priceWithCurrency = (value: string) => /₽|руб/i.test(value) ? value : `${value} ₽`;
const pluralParticipants = (count: number) => count % 10 === 1 && count % 100 !== 11 ? "участника" : "участников";
const pluralOptions = (count: number) => count % 10 === 1 && count % 100 !== 11 ? "вариант" : count % 10 >= 2 && count % 10 <= 4 && (count % 100 < 10 || count % 100 >= 20) ? "варианта" : "вариантов";
const GiftIcon = () => <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3.5 10.5h17v10h-17zM2.5 6.5h19v4h-19zM12 6.5v14M7.2 6.5C4.4 6.5 4 3.2 6 2.7c1.8-.5 4 1.5 6 3.8-2 .1-3.6 0-4.8 0ZM16.8 6.5c2.8 0 3.2-3.3 1.2-3.8-1.8-.5-4 1.5-6 3.8 2 .1 3.6 0 4.8 0Z" /></svg>;
const WalletIcon = () => <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6.5A2.5 2.5 0 0 1 6.5 4H18v3H6.5a1.5 1.5 0 0 0 0 3H20v8.5A2.5 2.5 0 0 1 17.5 21h-13A2.5 2.5 0 0 1 2 18.5v-10A2.5 2.5 0 0 1 4.5 6H18M16 15.5h2" /></svg>;
const PeopleIcon = () => <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="9" cy="8" r="3" /><circle cx="17" cy="10" r="2.3" /><path d="M3.5 20c.6-3.2 2.5-5 5.5-5s4.9 1.8 5.5 5M15 16.2c2.7-.4 4.6.8 5.2 3.8" /></svg>;
const CalendarIcon = () => <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3.5" y="5" width="17" height="15" rx="2" /><path d="M7.5 3.5v3M16.5 3.5v3M3.5 9h17" /></svg>;
const EyeIcon = () => <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2.5 12s3.4-5 9.5-5 9.5 5 9.5 5-3.4 5-9.5 5-9.5-5-9.5-5Z" /><circle cx="12" cy="12" r="2.5" /></svg>;
const PencilIcon = () => <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m4 16.5-.8 4.3 4.3-.8L19 8.5l-3.5-3.5L4 16.5ZM13.8 6.7l3.5 3.5" /></svg>;
const TrashIcon = () => <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4.5 7.5h15M9 4h6M7 7.5l.7 12h8.6l.7-12M10 11v5M14 11v5" /></svg>;

export const GiftPollSettingsForm = ({ manageToken, recipientName, publicSlug, poll, eligibleVoterCount }: { manageToken: string; recipientName: string; publicSlug: string; poll: GiftPollWithOptions | null; eligibleVoterCount: number }) => {
  const [enabled, setEnabled] = useState(Boolean(poll));
  const [mode, setMode] = useState<Mode>(poll?.mode ?? "gift");
  const [title, setTitle] = useState(poll?.title ?? defaultGiftPollCopy("gift", recipientName).title);
  const [question, setQuestion] = useState(poll?.question ?? defaultGiftPollCopy("gift", recipientName).question);
  const [closesAt, setClosesAt] = useState(toDateTimeLocal(poll?.closesAt));
  const [expandedIds, setExpandedIds] = useState<string[]>([]);
  const [draggedOptionId, setDraggedOptionId] = useState<string | null>(null);
  const [optionHint, setOptionHint] = useState<{ id: string; message: string; action: "edit" | "delete" } | null>(null);
  const [autoSaveVersion, setAutoSaveVersion] = useState(0);
  const formRef = useRef<HTMLFormElement>(null);
  const lastSubmittedAutoSaveVersion = useRef(0);
  const canDragOption = useRef(false);
  const [options, setOptions] = useState<EditableOption[]>(poll?.options.map((option) => ({
    id: option.id, title: option.title, description: option.description ?? "", imageUrl: option.imageUrl ?? "", priceLabel: option.priceLabel ?? "", productUrl: option.productUrl ?? ""
  })) ?? [emptyOption(), emptyOption()]);
  const [state, formAction, pending] = useActionState(saveGiftPollAction, initialState);
  const markForAutoSave = () => setAutoSaveVersion((version) => version + 1);
  const patchOption = (index: number, key: keyof EditableOption, value: string) => { setOptions((current) => current.map((option, itemIndex) => itemIndex === index ? { ...option, [key]: value } : option)); markForAutoSave(); };
  const submitAutoSave = useCallback(() => {
    const form = formRef.current;
    if (pending || !form?.checkValidity()) return;
    lastSubmittedAutoSaveVersion.current = autoSaveVersion;
    form.requestSubmit();
  }, [autoSaveVersion, pending]);
  const toggleOption = (id: string) => {
    const isClosing = expandedIds.includes(id);
    setExpandedIds((current) => isClosing ? current.filter((item) => item !== id) : [...current, id]);
    if (isClosing) window.setTimeout(submitAutoSave, 0);
  };
  const moveOption = (index: number, direction: -1 | 1) => setOptions((current) => {
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= current.length) return current;
    const next = [...current];
    [next[index], next[nextIndex]] = [next[nextIndex], next[index]];
    return next;
  });
  const moveOptionTo = (sourceId: string, targetId: string) => setOptions((current) => {
    const sourceIndex = current.findIndex((option) => option.id === sourceId);
    const targetIndex = current.findIndex((option) => option.id === targetId);
    if (sourceIndex < 0 || targetIndex < 0 || sourceIndex === targetIndex) return current;
    const next = [...current];
    const [source] = next.splice(sourceIndex, 1);
    next.splice(targetIndex, 0, source);
    return next;
  });
  const changeMode = (nextMode: Mode) => {
    if (nextMode === mode) return;
    if (poll && poll.totalVotes > 0) return;
    const hasFilledOption = options.some((option) => Object.values(option).some((value) => value.trim().length > 0));
    if (hasFilledOption && !window.confirm("Сменить режим и начать заново? Текущие варианты будут заменены.")) return;
    const previousDefaults = defaultGiftPollCopy(mode, recipientName);
    const nextDefaults = defaultGiftPollCopy(nextMode, recipientName);
    if (title === previousDefaults.title) setTitle(nextDefaults.title);
    if (question === previousDefaults.question) setQuestion(nextDefaults.question);
    setOptions([emptyOption(), emptyOption()]);
    setExpandedIds([]);
    setMode(nextMode);
    markForAutoSave();
  };

  useEffect(() => {
    if (!autoSaveVersion || pending || lastSubmittedAutoSaveVersion.current === autoSaveVersion) return;
    const timeout = window.setTimeout(() => {
      submitAutoSave();
    }, 700);
    return () => window.clearTimeout(timeout);
  }, [autoSaveVersion, pending, submitAutoSave]);

  if (!enabled) {
    return <section className={styles.giftPollEmptyState}>
      <div className={styles.giftPollEmptyIcon} aria-hidden="true">✦</div>
      <div><h2 className={styles.sectionTitle}>Выбор подарка</h2><p>Участники смогут проголосовать за подарок или бюджет после отправки поздравления. Результаты увидите только вы — получатель не увидит голосование в финальной открытке.</p></div>
      <button type="button" className={styles.giftPollEnableButton} onClick={() => setEnabled(true)}><span aria-hidden="true" />Включить голосование</button>
    </section>;
  }

  const isBudget = mode === "budget";
  const totalVotes = poll?.totalVotes ?? 0;
  const modeLocked = Boolean(poll && totalVotes > 0);
  const settingsLocked = totalVotes > 0;
  const statusLabel = poll?.status === "open" ? "Открыто" : poll?.status === "closed" ? "Завершено" : "Черновик";
  const remainingOptionCount = 6 - options.length;
  const validOptions = options.filter((option) => option.title.trim().length > 0);
  const hasInvalidLinks = options.some((option) => [option.productUrl, option.imageUrl].some((url) => Boolean(url) && !url.startsWith("https://")));
  const saveState = pending ? "saving" : state.message && !state.ok ? "error" : state.ok || Boolean(poll) ? "saved" : "idle";
  const isPollReady = Boolean(poll) && title.trim().length > 0 && question.trim().length > 0 && validOptions.length >= 2 && !hasInvalidLinks && saveState === "saved";

  return (
    <section className={styles.giftPollPage} data-poll-status={poll?.status ?? "draft"} onPointerDown={() => setOptionHint(null)} onPointerDownCapture={(event) => {
      canDragOption.current = event.target instanceof Element && Boolean(event.target.closest(`.${styles.giftPollDragHint}`));
    }} onDragStartCapture={(event) => {
      if (!canDragOption.current) event.preventDefault();
    }} onDragEndCapture={() => { canDragOption.current = false; }}>
      <div className={styles.giftPollLayout}>
      <div className={styles.giftPollMain}>
      <header className={styles.giftPollHero}>
        <div className={styles.giftPollHeroCopy}>
          <div className={styles.giftPollHeroHeading}><h2 className={styles.giftPollAdminTitle}>Голосование за {isBudget ? "бюджет" : "подарок"}</h2><strong className={styles.giftPollHeroState}>{statusLabel}</strong></div>
          <p>Участники голосуют после отправки поздравления.<br />Результаты видите только вы. Получатель не увидит голосование в финальной открытке.</p>
        </div>
      </header>

      <form id="gift-poll-settings" ref={formRef} action={formAction} className={styles.giftPollManagerForm}>
        <input type="hidden" name="manageToken" value={manageToken} />
        <input type="hidden" name="optionsPayload" value={JSON.stringify(options)} />
        <fieldset className={styles.giftPollModeFieldset}>
          <legend>Режим голосования <span>{modeLocked ? "выбран и зафиксирован" : "выберите один сценарий"}</span></legend>
          <div className={styles.giftPollModeChoices}>
            <label className={`${mode === "gift" ? styles.giftPollModeActive : ""} ${modeLocked && mode !== "gift" ? styles.giftPollModeDisabled : ""}`}><input type="radio" name="mode" value="gift" checked={mode === "gift"} disabled={modeLocked} onChange={() => changeMode("gift")} /><span className={styles.giftPollModeIcon}><GiftIcon /></span><span><strong>Выбрать подарок</strong><small>Один из конкретных вариантов</small></span></label>
            <label className={`${mode === "budget" ? styles.giftPollModeActive : ""} ${modeLocked && mode !== "budget" ? styles.giftPollModeDisabled : ""}`}><input type="radio" name="mode" value="budget" checked={mode === "budget"} disabled={modeLocked} onChange={() => changeMode("budget")} /><span className={styles.giftPollModeIcon}><WalletIcon /></span><span><strong>Выбрать бюджет</strong><small>Подходящий уровень общей суммы</small></span></label>
          </div>
          <p className={styles.giftPollModeHint}>{modeLocked ? "Режим нельзя изменить, потому что голосование уже началось." : isBudget ? "Участники выберут ориентир по общему бюджету. Это не сбор денег, а способ понять подходящий уровень суммы." : "Участники выберут один из конкретных вариантов подарка. Можно добавить название, описание, ссылку и фото."}</p>
        </fieldset>

        {settingsLocked ? <p className={styles.giftPollSettingsLocked}>Настройки зафиксированы после начала голосования.</p> : null}
        <div className={styles.giftPollQuestionGrid}>
          <label className={styles.giftPollField}>Заголовок голосования<input name="title" value={title} readOnly={settingsLocked} maxLength={80} required onChange={(event) => { setTitle(event.target.value); markForAutoSave(); }} /><small>{title.length} / 80</small></label>
          <label className={styles.giftPollField}>Вопрос для участников<input name="question" value={question} readOnly={settingsLocked} maxLength={180} required onChange={(event) => { setQuestion(event.target.value); markForAutoSave(); }} /><small>{question.length} / 180</small></label>
        </div>
        <section className={styles.giftPollOptionsSection}>
          <div className={styles.giftPollOptionsHeader}><div><h3>{isBudget ? "Варианты бюджета" : "Варианты подарков"}</h3><p>{totalVotes > 0 ? "Список вариантов зафиксирован после начала голосования." : remainingOptionCount > 0 ? `Можно добавить ещё ${remainingOptionCount} ${pluralOptions(remainingOptionCount)}` : "Достигнут максимум: 6 вариантов"}</p></div></div>
          <div className={styles.giftPollOptionList}>
            {options.map((option, index) => {
              const expanded = expandedIds.includes(option.id) || !poll;
              const votes = poll?.votesByOptionId[option.id] ?? 0;
              const percent = totalVotes ? Math.round((votes / totalVotes) * 100) : 0;
              const isSavedOption = Boolean(poll?.options.some((savedOption) => savedOption.id === option.id));
              const isLockedOption = isSavedOption && totalVotes > 0;
              const canRemoveOption = options.length > 2 && (!isSavedOption || totalVotes === 0);
              const deleteBlockedMessage = totalVotes > 0 && isSavedOption ? "Удалить невозможно, голосование уже идёт" : "Нужно оставить минимум два варианта";
              return <article key={option.id} onDragOver={(event) => event.preventDefault()} onDrop={() => { if (draggedOptionId) moveOptionTo(draggedOptionId, option.id); setDraggedOptionId(null); }} onDragEnd={() => setDraggedOptionId(null)} className={`${styles.giftPollOptionEditor} ${isBudget ? styles.giftPollBudgetEditor : ""} ${draggedOptionId === option.id ? styles.giftPollOptionDragging : ""}`}>
                <input type="hidden" name="optionId" value={option.id} />
                <header className={styles.giftPollOptionCardHeader}>
                  <span className={styles.giftPollDragHint} draggable onDragStart={() => setDraggedOptionId(option.id)} aria-label="Перетащите, чтобы изменить порядок">⠿</span>
                  {isBudget ? <div className={styles.giftPollBudgetPreview}><strong>{budgetInputValue(option.title) ? `${Number(budgetInputValue(option.title)).toLocaleString("ru-RU")} ₽` : "Сумма не указана"}</strong>{option.description ? <span>{option.description}</span> : null}</div> : <>{option.imageUrl ? <img src={option.imageUrl} alt="" className={styles.giftPollOptionThumbnail} /> : <div className={styles.giftPollOptionPlaceholder} aria-hidden="true">♢</div>}<div className={styles.giftPollOptionPreview}><strong>{option.title || `Вариант подарка ${index + 1}`}</strong>{option.description ? <span>{option.description}</span> : null}{option.priceLabel ? <em>{priceWithCurrency(option.priceLabel)}</em> : null}{option.productUrl ? <a href={option.productUrl} target="_blank" rel="noreferrer">{productSource(option.productUrl)}</a> : null}</div></>}
                  <div className={styles.giftPollOptionResult}><strong>{votes}</strong><span>{pluralVotes(votes).split(" ").slice(1).join(" ")}</span></div>
                  <div className={styles.giftPollProgress}><strong>{percent}%</strong><span><i style={{ width: `${percent}%` }} /></span></div>
                  <div className={styles.giftPollOptionCardActions}><button type="button" className={`${styles.giftPollIconAction} ${isLockedOption ? styles.giftPollIconActionMuted : ""}`} onClick={() => { if (isLockedOption) setOptionHint({ id: option.id, message: "Изменение недоступно: голосование уже идёт", action: "edit" }); else toggleOption(option.id); }} aria-label={isLockedOption ? "Изменение недоступно, голосование уже идёт" : "Редактировать вариант"} title={isLockedOption ? "Изменение недоступно, голосование уже идёт" : "Изменить вариант"}><PencilIcon /></button><button type="button" className={`${styles.giftPollIconAction} ${!canRemoveOption ? styles.giftPollIconActionMuted : ""}`} onClick={() => { if (canRemoveOption) { setOptions((current) => current.filter((_, itemIndex) => itemIndex !== index)); markForAutoSave(); } else setOptionHint({ id: option.id, message: deleteBlockedMessage, action: "delete" }); }} aria-label={canRemoveOption ? "Удалить вариант" : deleteBlockedMessage} title={canRemoveOption ? "Удалить вариант" : deleteBlockedMessage}><TrashIcon /></button><button type="button" className={styles.giftPollMoveButton} onClick={() => { moveOption(index, -1); markForAutoSave(); }} disabled={index === 0} aria-label="Переместить выше">↑</button><button type="button" className={styles.giftPollMoveButton} onClick={() => { moveOption(index, 1); markForAutoSave(); }} disabled={index === options.length - 1} aria-label="Переместить ниже">↓</button>{optionHint?.id === option.id ? <span className={`${styles.giftPollActionHint} ${optionHint.action === "edit" ? styles.giftPollActionHintEdit : ""}`} role="status">{optionHint.message}</span> : null}</div>
                </header>
                {expanded ? <div className={styles.giftPollOptionBody}>{isBudget ? <><label>Сумма, ₽<input name="optionTitle" readOnly={isLockedOption} value={budgetInputValue(option.title)} type="number" inputMode="numeric" min="1" max="9999999" required onChange={(event) => patchOption(index, "title", event.target.value)} placeholder="Например, 5000" /></label><label>Подпись <span>необязательно</span><input name="optionDescription" readOnly={isLockedOption} value={option.description} maxLength={140} onChange={(event) => patchOption(index, "description", event.target.value)} placeholder="Например, комфортный общий бюджет" /></label></> : <><label>Название<input name="optionTitle" readOnly={isLockedOption} value={option.title} maxLength={60} required onChange={(event) => patchOption(index, "title", event.target.value)} placeholder="Например, сертификат в SPA" /></label><label>Короткое описание<input name="optionDescription" readOnly={isLockedOption} value={option.description} maxLength={140} onChange={(event) => patchOption(index, "description", event.target.value)} placeholder="Например, можно выбрать удобный день и программу" /></label><div className={styles.giftPollOptionFields}><label>Ссылка на товар<input name="optionUrl" readOnly={isLockedOption} value={option.productUrl} inputMode="url" onChange={(event) => patchOption(index, "productUrl", event.target.value)} placeholder="https://…" /></label><label>Примерная стоимость<input name="optionPrice" readOnly={isLockedOption} value={option.priceLabel} maxLength={30} onChange={(event) => patchOption(index, "priceLabel", event.target.value)} placeholder="Например, около 5 000 ₽" /></label></div><label>Ссылка на изображение <span>необязательно</span><input name="optionImageUrl" readOnly={isLockedOption} value={option.imageUrl} inputMode="url" onChange={(event) => patchOption(index, "imageUrl", event.target.value)} placeholder="https://…/image.jpg" /></label></>}</div> : null}
              </article>;
            })}
          </div>
          {totalVotes === 0 && options.length < 6 ? <button type="button" className={styles.giftPollAddOptionWide} onClick={() => { const option = emptyOption(); setOptions((current) => [...current, option]); setExpandedIds((current) => [...current, option.id]); }}>＋ Добавить {isBudget ? "сумму" : "вариант"}</button> : null}
        </section>
        {state.message ? <p className={state.ok ? styles.giftPollFormSuccess : styles.giftPollFormError} aria-live="polite">{state.message}</p> : null}
        <p className={styles.giftPollAutosaveStatus} aria-live="polite">{pending ? "Сохраняем изменения…" : state.ok ? "Сохранено" : "Изменения сохраняются автоматически"}</p>
      </form>
      {(!poll || poll.status === "draft") ? <>
        <form id="gift-poll-launch" action={openGiftPollAction} onSubmit={(event) => { if (!window.confirm("Открыть голосование? Участники смогут голосовать после отправки поздравления. После первого голоса настройки нельзя будет изменить.")) event.preventDefault(); }}>
          <input type="hidden" name="manageToken" value={manageToken} />
          <input type="hidden" name="pollId" value={poll?.id ?? ""} />
        </form>
        <footer className={styles.giftPollLaunchFooter}>
          <div><strong>{isPollReady ? "Всё готово к запуску голосования" : "Завершите настройку голосования"}</strong><p>{isPollReady ? "После открытия участники смогут выбрать подарок." : saveState === "saving" ? "Сохраняем изменения…" : saveState === "error" ? "Не удалось сохранить изменения. Попробуйте ещё раз." : validOptions.length < 2 ? "Нужно добавить минимум два варианта." : hasInvalidLinks ? "Проверьте формат ссылок: используйте адреса, начинающиеся с https://." : "Заполните заголовок и вопрос для участников."}</p></div>
          <button type="submit" form="gift-poll-launch" className={styles.giftPollSaveButton} disabled={!isPollReady}>Открыть голосование</button>
        </footer>
      </> : null}

      {poll?.status === "closed" ? <><section className={styles.giftPollDecisionPanel}><h3>Выбор организатора</h3><p>Зафиксируйте вариант после завершения голосования.</p><div className={styles.giftPollDecisionOptions}>{poll.options.map((option) => {
        const selected = poll.selectedOptionId === option.id;
        return <article key={option.id} className={`${styles.giftPollDecisionOption} ${selected ? styles.giftPollDecisionOptionSelected : ""}`}><div><strong>{option.title}</strong>{option.description ? <span>{option.description}</span> : null}{option.priceLabel ? <em>{priceWithCurrency(option.priceLabel)}</em> : null}</div>{selected ? <span className={styles.giftPollDecisionSelectedLabel}>Выбрано</span> : <form action={selectGiftPollOptionAction}><input type="hidden" name="manageToken" value={manageToken} /><input type="hidden" name="pollId" value={poll.id} /><input type="hidden" name="optionId" value={option.id} /><button type="submit" className={styles.giftPollOpenButton}>Выбрать</button></form>}</article>;
      })}</div></section><form action={reopenGiftPollAction} onSubmit={(event) => { if (!window.confirm("Возобновить голосование? Участники снова смогут голосовать и менять свой выбор.")) event.preventDefault(); }}><input type="hidden" name="manageToken" value={manageToken} /><input type="hidden" name="pollId" value={poll.id} /><button type="submit" className={styles.giftPollOpenButton}>Возобновить голосование</button></form></> : null}
      </div>
      <aside className={styles.giftPollSidebar}>
        {(!poll || poll.status === "draft") ? <>
          <section className={`${styles.giftPollStatusCard} ${styles.giftPollDraftStatusCard}`} aria-label="Статус голосования">
            <div><strong>Статус голосования</strong><span className={styles.giftPollStatus}>Черновик</span></div>
            <p>Голосование ещё не открыто</p>
            <p><CalendarIcon />Завершение: вручную</p>
            <p><EyeIcon />Результаты видите только вы</p>
          </section>
          <section className={`${styles.giftPollParticipantView} ${styles.giftPollDraftParticipantView}`}>
            <strong>Как это видит участник</strong>
            <p>Голосование появится после того, как участник отправит поздравление.</p>
            <a href={`/join/${publicSlug}`} target="_blank" rel="noopener noreferrer" className={styles.giftPollParticipantLink}>Посмотреть как участник</a>
          </section>
          <section className={styles.giftPollDraftChecklist}>
            <strong>Перед открытием</strong>
            <ul>
              <li>{mode ? "✓" : "○"} Выбран сценарий голосования</li>
              <li>{title.trim() && question.trim() ? "✓" : "○"} Заполнены заголовок и вопрос</li>
              <li>{validOptions.length >= 2 ? "✓" : "○"} Добавлено минимум два варианта</li>
              <li>○ Проверьте ссылки и фотографии</li>
            </ul>
            <p>После первого голоса режим, формулировки и варианты будут зафиксированы.</p>
          </section>
        </> : null}
        <section className={styles.giftPollStatusCard} aria-label="Статус голосования">
          <div><strong>Статус голосования</strong><span className={poll?.status === "open" ? styles.giftPollStatusOpen : styles.giftPollStatus}>{statusLabel}</span></div>
          <p><PeopleIcon />Проголосовали: {eligibleVoterCount > 0 ? `${totalVotes} из ${eligibleVoterCount} ${pluralParticipants(eligibleVoterCount)}, добавивших поздравление` : `${totalVotes} ${totalVotes === 1 ? "участник" : "участников"}`}</p>
          <p><CalendarIcon />Завершение: {formatDate(poll?.closesAt ?? null)}</p>
          <p><EyeIcon />Результаты видите только вы</p>
        </section>
        <section className={styles.giftPollParticipantView}>
          <strong>Как это видит участник</strong>
          <p>Голосование появится после того, как участник отправит поздравление.</p>
          <a href={`/join/${publicSlug}`} target="_blank" rel="noopener noreferrer" className={styles.giftPollParticipantLink}>Открыть форму участника</a>
        </section>
        {poll?.status !== "draft" ? <section className={styles.giftPollFinishCard}>
          <strong>Завершение голосования</strong>
          <p>После закрытия участники больше не смогут голосовать или менять выбор.</p>
          <label className={styles.giftPollDateField}>Планируемая дата завершения <span>Для вашего удобства. Голосование закроется только после нажатия кнопки.</span><input form="gift-poll-settings" type="datetime-local" name="closesAt" value={closesAt} onChange={(event) => { setClosesAt(event.target.value); markForAutoSave(); }} /></label>
          {poll?.status === "open" ? <form action={closeGiftPollAction}><input type="hidden" name="manageToken" value={manageToken} /><input type="hidden" name="pollId" value={poll.id} /><button type="submit" className={styles.giftPollCloseButton}>Закрыть голосование</button></form> : null}
        </section> : null}
      </aside>
      </div>
    </section>
  );
};
