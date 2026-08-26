"use client";

/* eslint-disable @next/next/no-img-element */

import { useActionState, useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import type { GiftPollWithOptions } from "@/lib/gift-polls/types";
import { defaultGiftPollCopy, isSystemDefaultPollQuestion, isSystemDefaultPollTitle } from "@/lib/gift-polls/validation";
import { cleanImportedDescription, sanitizeGiftPollText } from "@/lib/gift-polls/text-sanitization";
import { emptyImportedGiftFields, importWouldOverwriteUserEdits, isSafeHttpUrl, isUsableImportResult, mergeImportedDraft, type GiftFieldSources, type ImportedGiftFields } from "@/lib/gift-polls/import-draft";
import { compressImageFile } from "@/lib/media/image-compression";
import { versionInvitationUrl } from "@/lib/routes/card-links";
import { closeGiftPollAction, enableGiftPollAction, openGiftPollAction, reopenGiftPollAction, saveGiftPollAction, saveGiftPollSettingsAction, selectGiftPollOptionAction, type GiftPollFormState } from "./actions";
import { ConfirmationDialog } from "./confirmation-dialog";
import { useModalFocus } from "./use-modal-focus";
import { GiftPollOrderEditor } from "./gift-poll-order-editor";
import { ActionMenu, MenuDeleteIcon, MenuEditIcon } from "./action-menu";
import styles from "./manage-page.module.css";

type Mode = "gift" | "budget";
type EditableOption = { id: string; title: string; description: string; imageUrl: string; priceLabel: string; productUrl: string };
type PendingPhotoChange = { kind: "replace"; file: File; previewUrl: string; uploadedUrl?: string } | { kind: "remove" };
const sameOption = (left: EditableOption, right: EditableOption) => left.title === right.title && left.description === right.description && left.imageUrl === right.imageUrl && left.priceLabel === right.priceLabel && left.productUrl === right.productUrl;
const emptyOption = (): EditableOption => ({ id: crypto.randomUUID(), title: "", description: "", imageUrl: "", priceLabel: "", productUrl: "" });
const toEditable = (option: GiftPollWithOptions["options"][number]): EditableOption => ({
  id: option.id,
  title: sanitizeGiftPollText(option.title, 60),
  description: cleanImportedDescription(option.description, option.title),
  imageUrl: option.imageUrl ?? "",
  priceLabel: sanitizeGiftPollText(option.priceLabel, 30),
  productUrl: option.productUrl ?? ""
});
const initialState: GiftPollFormState = { ok: false, message: "" };
const budgetInputValue = (title: string) => title.replace(/\D/g, "");
const toDateTimeLocal = (value: string | null | undefined) => value ? new Date(value).toISOString().slice(0, 16) : "";
const formatCloseDate = (value: string | null) => value ? new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" }).format(new Date(value)) : "Вручную";
const pluralVotes = (count: number) => `${count} ${count % 10 === 1 && count % 100 !== 11 ? "голос" : count % 10 >= 2 && count % 10 <= 4 && (count % 100 < 10 || count % 100 >= 20) ? "голоса" : "голосов"}`;
const productSource = (url: string) => {
  try { return new URL(url).hostname.replace(/^www\./, ""); } catch { return "ссылка на товар"; }
};
const priceWithCurrency = (value: string) => /₽|руб/i.test(value) ? value : `${value} ₽`;
const pluralOptions = (count: number) => count % 10 === 1 && count % 100 !== 11 ? "вариант" : count % 10 >= 2 && count % 10 <= 4 && (count % 100 < 10 || count % 100 >= 20) ? "варианта" : "вариантов";
const isLockConflictMessage = (message: string) => /зафиксирован|первого голоса|голосование уже/i.test(message);

const GiftIcon = () => <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3.5 10.5h17v10h-17zM2.5 6.5h19v4h-19zM12 6.5v14M7.2 6.5C4.4 6.5 4 3.2 6 2.7c1.8-.5 4 1.5 6 3.8-2 .1-3.6 0-4.8 0ZM16.8 6.5c2.8 0 3.2-3.3 1.2-3.8-1.8-.5-4 1.5-6 3.8 2 .1 3.6 0 4.8 0Z" /></svg>;
const WalletIcon = () => <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6.5A2.5 2.5 0 0 1 6.5 4H18v3H6.5a1.5 1.5 0 0 0 0 3H20v8.5A2.5 2.5 0 0 1 17.5 21h-13A2.5 2.5 0 0 1 2 18.5v-10A2.5 2.5 0 0 1 4.5 6H18M16 15.5h2" /></svg>;
const PeopleIcon = () => <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="9" cy="8" r="3" /><circle cx="17" cy="10" r="2.3" /><path d="M3.5 20c.6-3.2 2.5-5 5.5-5s4.9 1.8 5.5 5M15 16.2c2.7-.4 4.6.8 5.2 3.8" /></svg>;
const CalendarIcon = () => <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3.5" y="5" width="17" height="15" rx="2" /><path d="M7.5 3.5v3M16.5 3.5v3M3.5 9h17" /></svg>;
const EyeIcon = () => <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2.5 12s3.4-5 9.5-5 9.5 5-9.5 5-3.4 5-9.5 5-9.5-5-9.5-5Z" /><circle cx="12" cy="12" r="2.5" /></svg>;
const PencilIcon = () => <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m4 16.5-.8 4.3 4.3-.8L19 8.5l-3.5-3.5L4 16.5ZM13.8 6.7l3.5 3.5" /></svg>;
const SwitchIcon = () => <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="7" width="18" height="10" rx="5" /><circle cx="9" cy="12" r="3" /></svg>;
const ShieldIcon = () => <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.8 20 6v5.2c0 5-3.3 8.5-8 10-4.7-1.5-8-5-8-10V6l8-3.2Z" /><path d="M12 8v6M9.8 11.8 12 14l2.2-2.2" /></svg>;
const HelpIcon = () => <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="M9.8 9.4a2.4 2.4 0 1 1 3.4 2.2c-.8.4-1.2.9-1.2 1.8M12 17h.01" /></svg>;
const CloseIcon = () => <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18" /></svg>;
const ChevronDownIcon = () => <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6.5 9.5 5.5 5 5.5-5" /></svg>;
const InfoIcon = () => <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="M12 10.5v5M12 7h.01" /></svg>;
const ExternalIcon = () => <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14 4h6v6M20 4 11 13M9 5H6a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2v-3" /></svg>;
const ImageIcon = () => <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3.5" y="5" width="17" height="14" rx="2.5" /><circle cx="9" cy="10" r="1.5" /><path d="m4.5 17 4.3-4.2 2.8 2.4 2.5-2.6 3.4 4.4" /></svg>;

const GiftPollHowDialog = ({ onClose }: { onClose: () => void }) => {
  const dialogRef = useRef<HTMLElement>(null);
  useModalFocus(dialogRef, onClose);

  return createPortal(
    <div className={styles.giftPollInfoBackdrop} role="presentation" onPointerDown={(event) => event.target === event.currentTarget && onClose()}>
      <section ref={dialogRef} className={styles.giftPollInfoDialog} role="dialog" aria-modal="true" aria-labelledby="gift-poll-info-title" tabIndex={-1}>
        <header className={styles.giftPollInfoHeader}>
          <div><span>Выбор подарка</span><h2 id="gift-poll-info-title">Как работает голосование</h2></div>
          <button type="button" onClick={onClose} aria-label="Закрыть информацию"><CloseIcon /></button>
        </header>
        <ul className={styles.giftPollInfoList}>
          <li><span>1</span><p>Голосование появится у участника только после отправки поздравления.</p></li>
          <li><span>2</span><p>Участник выбирает один вариант подарка или ориентировочного бюджета.</p></li>
          <li><span>3</span><p>Результаты доступны только организатору открытки.</p></li>
          <li><span>4</span><p>Получатель не увидит голосование и его результаты в финальной открытке.</p></li>
          <li><span>5</span><p>До передачи открытки голосование можно изменить, закрыть или снова открыть.</p></li>
        </ul>
        <button type="button" className={styles.giftPollInfoDone} onClick={onClose}>Понятно</button>
      </section>
    </div>,
    document.body
  );
};

const VoterInfoPopover = () => {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<{ top: number; left: number }>({ top: 0, left: 0 });

  useEffect(() => {
    if (!open) return;
    const updatePosition = () => {
      const triggerRect = triggerRef.current?.getBoundingClientRect();
      const popoverRect = popoverRef.current?.getBoundingClientRect();
      if (!triggerRect || !popoverRect) return;
      const pad = 12;
      let top = triggerRect.bottom + 8;
      let left = triggerRect.left - 12;
      if (left + popoverRect.width > window.innerWidth - pad) left = window.innerWidth - popoverRect.width - pad;
      if (left < pad) left = pad;
      if (top + popoverRect.height > window.innerHeight - pad) top = triggerRect.top - popoverRect.height - 8;
      setPosition({ top, left });
    };
    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    const focusTimer = window.setTimeout(() => popoverRef.current?.focus(), 0);
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        setOpen(false);
      }
      if (event.key === "Tab" && popoverRef.current) {
        event.preventDefault();
        popoverRef.current.focus();
      }
    };
    const onPointerDown = (event: PointerEvent) => {
      if (!popoverRef.current?.contains(event.target as Node) && !triggerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("pointerdown", onPointerDown);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
      window.clearTimeout(focusTimer);
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("pointerdown", onPointerDown);
    };
  }, [open]);

  useEffect(() => {
    if (!open) triggerRef.current?.focus();
  }, [open]);

  return <span className={styles.giftPollVoterInfoWrap}>
    <button
      ref={triggerRef}
      type="button"
      className={styles.giftPollAccessHint}
      aria-label="Кто может голосовать"
      title="Кто может голосовать. Поздравления, добавленные организатором, не учитываются."
      aria-expanded={open}
      aria-haspopup="dialog"
      onClick={() => setOpen((current) => !current)}
    >
      <span aria-hidden="true">i</span>
    </button>
    {open ? createPortal(
      <div
        ref={popoverRef}
        className={styles.giftPollVoterInfoPopover}
        role="dialog"
        aria-modal="true"
        aria-labelledby="voter-info-title"
        tabIndex={-1}
        style={{ position: "fixed", top: position.top, left: position.left }}
      >
        <strong id="voter-info-title">Кто может голосовать</strong>
        <p>Голосование доступно участникам, которые отправили поздравление через форму. Поздравления, добавленные организатором вручную, не увеличивают это число.</p>
      </div>,
      document.body
    ) : null}
  </span>;
};

const GiftPollSettingsDialog = ({ manageToken, poll, recipientName, onClose, onSaved }: { manageToken: string; poll: GiftPollWithOptions; recipientName: string; onClose: () => void; onSaved: (message: string) => void }) => {
  const dialogRef = useRef<HTMLElement>(null);
  const locked = poll.totalVotes > 0;
  const [mode, setMode] = useState<Mode>(poll.mode);
  const [title, setTitle] = useState(poll.title);
  const [question, setQuestion] = useState(poll.question);
  const [closesAt, setClosesAt] = useState(toDateTimeLocal(poll.closesAt));
  const [pendingMode, setPendingMode] = useState<Mode | null>(null);
  const [showDiscardConfirmation, setShowDiscardConfirmation] = useState(false);
  const [showLockedModeHint, setShowLockedModeHint] = useState(false);
  const [state, formAction, pending] = useActionState(saveGiftPollSettingsAction, initialState);

  const currentScenarioLabel = mode === "budget" ? "Бюджет" : "Подарок";
  const dirty = mode !== poll.mode || title !== poll.title || question !== poll.question || closesAt !== toDateTimeLocal(poll.closesAt);

  useEffect(() => {
    if (state.ok) onSaved(state.message || "Настройки голосования сохранены.");
  }, [state, onSaved]);

  useEffect(() => {
    if (!showLockedModeHint) return;
    const timer = window.setTimeout(() => setShowLockedModeHint(false), 4000);
    return () => window.clearTimeout(timer);
  }, [showLockedModeHint]);

  const applyMode = (nextMode: Mode) => {
    if (locked || nextMode === mode) return;
    const nextDefaults = defaultGiftPollCopy(nextMode);
    if (isSystemDefaultPollTitle(title, mode)) setTitle(nextDefaults.title);
    if (isSystemDefaultPollQuestion(question, mode, recipientName)) setQuestion(nextDefaults.question);
    setMode(nextMode);
  };

  const changeMode = (nextMode: Mode) => {
    if (locked || nextMode === mode) return;
    if (poll.options.length > 0) {
      setPendingMode(nextMode);
      return;
    }
    applyMode(nextMode);
  };

  const requestClose = useCallback(() => {
    if (pending) return;
    if (dirty && !pendingMode) setShowDiscardConfirmation(true);
    else onClose();
  }, [pending, dirty, pendingMode, onClose]);

  useModalFocus(dialogRef, requestClose);

  return createPortal(<>
    <div className={styles.giftPollInfoBackdrop} role="presentation" onPointerDown={(event) => event.target === event.currentTarget && requestClose()}>
      <section ref={dialogRef} className={styles.giftPollModal} role="dialog" aria-modal="true" aria-labelledby="gift-poll-settings-title" aria-hidden={showDiscardConfirmation || pendingMode ? "true" : undefined} tabIndex={-1}>
        <header className={styles.giftPollModalHeader}>
          <div><span>Выбор подарка</span><h2 id="gift-poll-settings-title">Настройки голосования</h2></div>
          <button type="button" onClick={requestClose} aria-label="Закрыть настройки"><CloseIcon /></button>
        </header>
        <form action={formAction} className={styles.giftPollModalForm} aria-busy={pending}>
          <input type="hidden" name="manageToken" value={manageToken} />
          <input type="hidden" name="pollId" value={poll.id} />
          <input type="hidden" name="mode" value={mode} />
          <div className={styles.giftPollModalBody}>
            <fieldset
              className={styles.giftPollModeFieldset}
              title={locked ? "Сценарий нельзя изменить после получения первого голоса." : undefined}
              onClick={() => { if (locked) setShowLockedModeHint(true); }}
            >
              <legend>Сценарий</legend>
              <div className={styles.giftPollModeChoices}>
                <label className={`${mode === "gift" ? styles.giftPollModeActive : ""} ${locked ? styles.giftPollModeDisabled : ""}`} title={locked ? "Сценарий нельзя изменить после получения первого голоса." : undefined}><input type="radio" name="modeChoice" value="gift" checked={mode === "gift"} disabled={locked} onChange={() => changeMode("gift")} /><span className={styles.giftPollModeIcon}><GiftIcon /></span><span><strong>Подарок</strong><small>Один из конкретных вариантов</small></span></label>
                <label className={`${mode === "budget" ? styles.giftPollModeActive : ""} ${locked ? styles.giftPollModeDisabled : ""}`} title={locked ? "Сценарий нельзя изменить после получения первого голоса." : undefined}><input type="radio" name="modeChoice" value="budget" checked={mode === "budget"} disabled={locked} onChange={() => changeMode("budget")} /><span className={styles.giftPollModeIcon}><WalletIcon /></span><span><strong>Бюджет</strong><small>Подходящий уровень общей суммы</small></span></label>
              </div>
              {showLockedModeHint ? <p className={styles.giftPollModeLockedHint} role="status">Сценарий нельзя изменить после получения первого голоса.</p> : null}
              <p className={styles.giftPollModeHint}>Сценарий определяет, за что будут голосовать участники. При смене сценария добавленные варианты текущего сценария будут удалены.</p>
            </fieldset>
            <label className={styles.giftPollField}>Заголовок голосования<input name="title" value={title} readOnly={locked} maxLength={80} required onChange={(event) => setTitle(event.target.value)} /><small>{title.length} / 80</small></label>
            <label className={styles.giftPollField}>Вопрос для участников<input name="question" value={question} readOnly={locked} maxLength={180} required onChange={(event) => setQuestion(event.target.value)} /><small>{question.length} / 180</small></label>
            {locked ? <p className={styles.giftPollLockedNote}>Настройку нельзя изменить после получения первого голоса.</p> : null}
            <label className={styles.giftPollField}>Завершение голосования<span>Оставьте пустым, чтобы закрыть голосование вручную.</span><input type="datetime-local" name="closesAt" value={closesAt} onChange={(event) => setClosesAt(event.target.value)} /></label>
            {state.message && !state.ok ? <p className={styles.giftPollModalError} role="alert">{state.message}</p> : null}
          </div>
          <footer className={styles.giftPollModalFooter}>
            <button type="button" className={styles.giftPollModalCancel} disabled={pending} onClick={requestClose}>Отмена</button>
            <button type="submit" className={styles.giftPollModalSubmit} disabled={pending || !title.trim() || !question.trim()}>{pending ? "Сохраняем…" : "Сохранить настройки"}</button>
          </footer>
        </form>
      </section>
    </div>
    {pendingMode ? <ConfirmationDialog
      title="Сменить сценарий голосования?"
      description={`Добавленные варианты сценария «${currentScenarioLabel}» будут удалены. Это действие нельзя отменить.`}
      onDismiss={() => setPendingMode(null)}
      actions={[
        { label: `Остаться в сценарии «${currentScenarioLabel}»`, tone: "secondary", onClick: () => setPendingMode(null) },
        { label: "Сменить и удалить варианты", tone: "danger", onClick: () => { const nextMode = pendingMode; setPendingMode(null); applyMode(nextMode); } }
      ]}
    /> : null}
    {showDiscardConfirmation ? <ConfirmationDialog
      title="Закрыть без сохранения?"
      description="Внесённые изменения будут потеряны."
      onDismiss={() => setShowDiscardConfirmation(false)}
      actions={[
        { label: "Продолжить редактирование", tone: "secondary", onClick: () => setShowDiscardConfirmation(false) },
        { label: "Выйти без сохранения", tone: "danger", onClick: onClose }
      ]}
    /> : null}
    </>,
    document.body
  );
};

const ImportSpinner = () => <span className={styles.giftPollImportSpinner} aria-hidden="true" />;

type PreviewResponse = { extractedUrl?: string; resolvedUrl?: string; warnings?: string[]; metadata?: { title: string | null; description: string | null; imageUrl: string | null; price: { amount: number; currency: string } | null } };

type ImportStatus = "idle" | "loading" | "network-error" | "server-error" | "failed";

const toImportedFields = (data: PreviewResponse): ImportedGiftFields => ({
  title: sanitizeGiftPollText(data.metadata?.title, 60),
  description: cleanImportedDescription(data.metadata?.description, data.metadata?.title),
  productUrl: data.resolvedUrl ?? data.extractedUrl ?? "",
  imageUrl: data.metadata?.imageUrl ?? "",
  priceLabel: data.metadata?.price ? new Intl.NumberFormat("ru-RU").format(data.metadata.price.amount) : ""
});

const importStatusMessages: Record<Exclude<ImportStatus, "idle" | "loading">, string> = {
  "network-error": "Не удалось загрузить данные. Проверьте соединение и попробуйте ещё раз.",
  "server-error": "Не удалось автоматически заполнить карточку. Добавьте данные вручную или попробуйте ещё раз.",
  failed: "Не удалось автоматически заполнить карточку. Добавьте данные вручную."
};

type ImportDraft = { rawInput: string; fields: ImportedGiftFields | null; sources: GiftFieldSources; partial: boolean };
const emptyImportDraft = (): ImportDraft => ({ rawInput: "", fields: null, sources: {}, partial: false });

const GiftOptionImportStep = ({ manageToken, draft, onRawInputChange, onApply, onManual, onDirtyChange }: { manageToken: string; draft: ImportDraft; onRawInputChange: (value: string) => void; onApply: (fields: ImportedGiftFields, sources: GiftFieldSources, partial: boolean) => void; onManual: () => void; onDirtyChange?: (dirty: boolean) => void }) => {
  const [status, setStatus] = useState<ImportStatus>("idle");
  const [pendingNext, setPendingNext] = useState<{ fields: ImportedGiftFields; partial: boolean } | null>(null);
  const rawInput = draft.rawInput;

  const applyResult = (fields: ImportedGiftFields, partial: boolean, keepUserEdits: boolean) => {
    const merged = mergeImportedDraft(draft.fields ? { fields: draft.fields, sources: draft.sources } : null, fields, keepUserEdits);
    onApply(merged.fields, merged.sources, partial);
  };

  const importLink = async () => {
    if (!rawInput.trim() || status === "loading") return;
    setStatus("loading");
    let data: PreviewResponse | null = null;
    let response: Response;
    try {
      response = await fetch("/api/manage/gift-poll-preview", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ manageToken, rawInput }) });
      data = await response.json().catch(() => null) as PreviewResponse | null;
      if (!response.ok || !data) { setStatus("server-error"); return; }
    } catch { setStatus("network-error"); return; }
    if (!data.extractedUrl) { setStatus("failed"); return; }
    const fields = toImportedFields(data);
    if (!isUsableImportResult(fields)) { setStatus("failed"); return; }
    const partial = !fields.title || Boolean(data.warnings?.includes("METADATA_PARTIAL"));
    if (draft.fields && importWouldOverwriteUserEdits(draft.fields, draft.sources, fields)) {
      setPendingNext({ fields, partial });
      setStatus("idle");
      return;
    }
    applyResult(fields, partial, true);
  };

  return <div className={styles.giftPollImportStep}>
    <label className={styles.giftPollImportField}>
      Ссылка или текст из магазина
      <textarea value={rawInput} disabled={status === "loading"} onChange={(event) => { onRawInputChange(event.target.value); onDirtyChange?.(Boolean(event.target.value.trim())); }} placeholder="Вставьте ссылку или описание товара из магазина" />
    </label>
    {!rawInput.trim() && status === "idle" ? <p className={styles.giftPollImportHelper}>Вставьте ссылку на товар или его описание.</p> : null}
    {status !== "idle" && status !== "loading" ? <p className={styles.giftPollModalError} role="alert">{importStatusMessages[status]}</p> : null}
    <div className={styles.giftPollImportActions}>
      <button type="button" className={styles.giftPollImportButton} disabled={status === "loading" || !rawInput.trim()} onClick={importLink}>
        {status === "loading" ? <><ImportSpinner />Заполняем карточку…</> : status === "idle" ? "Заполнить карточку" : "Попробовать ещё раз"}
      </button>
      <button type="button" className={styles.giftPollManualAddButton} disabled={status === "loading"} onClick={onManual}>
        Добавить вручную
      </button>
    </div>
    {pendingNext ? <ConfirmationDialog
      title="Заменить данные в карточке?"
      description="Новый импорт может заменить данные, которые вы изменили вручную."
      onDismiss={() => setPendingNext(null)}
      actions={[
        { label: "Сохранить мои изменения", tone: "secondary", onClick: () => { const pending = pendingNext; setPendingNext(null); applyResult(pending.fields, pending.partial, true); } },
        { label: "Заменить импортированными", tone: "primary", onClick: () => { const pending = pendingNext; setPendingNext(null); applyResult(pending.fields, pending.partial, false); } },
        { label: "Отмена", tone: "secondary", onClick: () => setPendingNext(null) }
      ]}
    /> : null}
  </div>;
};

type EditorState = { option: EditableOption; isNew: boolean; readOnly: boolean; prefilled?: boolean; fromImport?: boolean };

const IMAGE_MAX_BYTES = 6 * 1024 * 1024;
const IMAGE_ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

const GiftOptionImportDialog = ({ manageToken, draft, onRawInputChange, onClose, onApply, onManual }: { manageToken: string; draft: ImportDraft; onRawInputChange: (value: string) => void; onClose: () => void; onApply: (fields: ImportedGiftFields, sources: GiftFieldSources, partial: boolean) => void; onManual: () => void }) => {
  const dialogRef = useRef<HTMLElement>(null);
  const [dirty, setDirty] = useState(false);
  const [showDiscardConfirmation, setShowDiscardConfirmation] = useState(false);
  const requestClose = useCallback(() => {
    if (dirty) setShowDiscardConfirmation(true);
    else onClose();
  }, [dirty, onClose]);
  useModalFocus(dialogRef, requestClose);

  return createPortal(<>
    <div className={styles.giftPollBottomSheetBackdrop} role="presentation" onPointerDown={(event) => event.target === event.currentTarget && requestClose()}>
      <section ref={dialogRef} className={styles.giftPollBottomSheet} role="dialog" aria-modal="true" aria-labelledby="gift-option-import-title" aria-hidden={showDiscardConfirmation ? "true" : undefined} tabIndex={-1}>
        <header className={styles.giftPollBottomSheetHeader}>
          <div><span>Вариант подарка</span><h2 id="gift-option-import-title">Добавить по ссылке или тексту</h2></div>
          <button type="button" onClick={requestClose} aria-label="Закрыть"><CloseIcon /></button>
        </header>
        <div className={styles.giftPollBottomSheetBody}>
          <GiftOptionImportStep
            manageToken={manageToken}
            draft={draft}
            onRawInputChange={onRawInputChange}
            onApply={(fields, sources, partial) => { onApply(fields, sources, partial); onClose(); }}
            onManual={() => { onManual(); onClose(); }}
            onDirtyChange={setDirty}
          />
        </div>
      </section>
    </div>
    {showDiscardConfirmation ? <ConfirmationDialog
      title="Закрыть без сохранения?"
      description="Внесённые изменения будут потеряны."
      onDismiss={() => setShowDiscardConfirmation(false)}
      actions={[
        { label: "Продолжить редактирование", tone: "secondary", onClick: () => setShowDiscardConfirmation(false) },
        { label: "Выйти без сохранения", tone: "danger", onClick: onClose }
      ]}
    /> : null}
    </>,
    document.body
  );
};

const GiftOptionEditorDialog = ({ mode, editor, saving, error, prefillWarning, onSave, onDelete, onRequestClose, onUserEdit }: { mode: Mode; editor: EditorState; saving: boolean; error: string; prefillWarning?: string; onSave: (option: EditableOption, photoChange: PendingPhotoChange | undefined) => void; onDelete?: () => void; onRequestClose: (dirty: boolean) => void; onUserEdit?: (fields: ImportedGiftFields, key: keyof ImportedGiftFields) => void }) => {
  const dialogRef = useRef<HTMLElement>(null);
  const [option, setOption] = useState<EditableOption>(editor.option);
  const [photoChange, setPhotoChange] = useState<PendingPhotoChange | undefined>(undefined);
  const [photoError, setPhotoError] = useState("");
  const isBudget = mode === "budget";
  const dirty = Boolean(editor.prefilled) || !sameOption(option, editor.option) || Boolean(photoChange);
  const canSave = option.title.trim().length > 0 && (editor.isNew ? true : dirty);
  const requestClose = useCallback(() => onRequestClose(editor.readOnly ? false : dirty), [onRequestClose, editor.readOnly, dirty]);
  useModalFocus(dialogRef, requestClose);

  const patch = (key: keyof EditableOption, value: string) => {
    const next = { ...option, [key]: value };
    setOption(next);
    onUserEdit?.({ title: next.title, description: next.description, productUrl: next.productUrl, imageUrl: next.imageUrl, priceLabel: next.priceLabel }, key as keyof ImportedGiftFields);
  };

  const revokePreview = () => {
    if (photoChange?.kind === "replace") URL.revokeObjectURL(photoChange.previewUrl);
  };

  const selectPhoto = (file: File | undefined) => {
    if (!file || saving) return;
    if (!IMAGE_ALLOWED_TYPES.has(file.type)) {
      setPhotoError("Поддерживаются изображения JPG, PNG и WebP.");
      return;
    }
    if (file.size > IMAGE_MAX_BYTES) {
      setPhotoError("Размер изображения не должен превышать 6 МБ.");
      return;
    }
    setPhotoError("");
    revokePreview();
    setPhotoChange({ kind: "replace", file, previewUrl: URL.createObjectURL(file) });
  };

  return createPortal(
    <div className={styles.giftPollInfoBackdrop} role="presentation" onPointerDown={(event) => event.target === event.currentTarget && requestClose()}>
      <section ref={dialogRef} className={`${styles.giftPollModal} ${styles.giftPollOptionModal}`} role="dialog" aria-modal="true" aria-labelledby="gift-option-editor-title" tabIndex={-1}>
        <header className={styles.giftPollModalHeader}>
          <div><span>{isBudget ? "Вариант бюджета" : "Вариант подарка"}</span><h2 id="gift-option-editor-title">{editor.readOnly ? "Просмотр варианта" : editor.isNew ? "Добавить вариант" : "Редактирование варианта"}</h2></div>
          <button type="button" onClick={requestClose} aria-label="Закрыть редактор"><CloseIcon /></button>
        </header>
        <div className={styles.giftPollModalBody}>
          <div className={styles.giftPollOptionForm}>
            {prefillWarning ? <p className={styles.giftPollImportWarning} role="status">{prefillWarning}</p> : null}
            {isBudget ? <>
              <label className={styles.giftPollField}>Сумма, ₽<input readOnly={editor.readOnly} value={budgetInputValue(option.title)} type="number" inputMode="numeric" min="1" max="9999999" required onChange={(event) => patch("title", event.target.value)} placeholder="Например, 5000" /></label>
              <label className={styles.giftPollField}>Пояснение <span>необязательно</span><input readOnly={editor.readOnly} value={option.description} maxLength={140} onChange={(event) => patch("description", event.target.value)} placeholder="Например, небольшой общий подарок" /></label>
            </> : <>
              <label className={styles.giftPollField}>Название<input readOnly={editor.readOnly} value={option.title} maxLength={60} required onChange={(event) => patch("title", event.target.value)} placeholder="Например, сертификат в SPA" /></label>
              <label className={styles.giftPollField}>Примерная стоимость <span>необязательно</span><input readOnly={editor.readOnly} value={option.priceLabel} maxLength={30} onChange={(event) => patch("priceLabel", event.target.value)} placeholder="Например, около 5 000 ₽" /></label>
              <label className={styles.giftPollField}>Короткое описание <span>необязательно</span><input readOnly={editor.readOnly} value={option.description} maxLength={140} onChange={(event) => patch("description", event.target.value)} placeholder="Например, можно выбрать удобный день и программу" /></label>
              <label className={styles.giftPollField}>Ссылка на товар <span>необязательно</span><input readOnly={editor.readOnly} value={option.productUrl} inputMode="url" onChange={(event) => patch("productUrl", event.target.value)} placeholder="https://…" /></label>
              {option.productUrl.startsWith("https://") ? <a className={styles.giftPollOpenProductLink} href={option.productUrl} target="_blank" rel="noopener noreferrer">Открыть ссылку ↗</a> : null}
              <div className={styles.giftPollPhotoBlock}>
                <strong className={styles.giftPollPhotoBlockTitle}>Изображение <span>необязательно</span></strong>
                {photoChange?.kind === "replace" ? <>
                  <img src={photoChange.previewUrl} alt="Новое выбранное изображение" className={styles.giftPollPhotoBlockPreview} />
                  {!editor.readOnly ? <div className={styles.giftPollPhotoBlockActions}>
                    <label htmlFor="gift-option-photo" className={styles.giftPollPhotoBlockAction}>Заменить изображение</label>
                    <button type="button" className={styles.giftPollPhotoBlockActionMuted} disabled={saving} onClick={() => { revokePreview(); setPhotoChange(undefined); }}>Отменить замену</button>
                  </div> : null}
                  <p className={styles.giftPollPhotoBlockHint}>Изображение будет загружено после сохранения изменений.</p>
                </> : photoChange?.kind === "remove" ? <>
                  <div className={styles.giftPollPhotoBlockPreviewEmpty} aria-hidden="true"><ImageIcon /></div>
                  {!editor.readOnly ? <div className={styles.giftPollPhotoBlockActions}>
                    <button type="button" className={styles.giftPollPhotoBlockActionMuted} disabled={saving} onClick={() => setPhotoChange(undefined)}>Отменить удаление</button>
                  </div> : null}
                  <p className={styles.giftPollPhotoBlockHint}>Изображение будет удалено после сохранения изменений.</p>
                </> : option.imageUrl ? <>
                  <img src={option.imageUrl} alt={`Изображение варианта: ${option.title || "подарок"}`} className={styles.giftPollPhotoBlockPreview} />
                  {!editor.readOnly ? <div className={styles.giftPollPhotoBlockActions}>
                    <label htmlFor="gift-option-photo" className={styles.giftPollPhotoBlockAction}>Заменить изображение</label>
                    <button type="button" className={styles.giftPollPhotoBlockActionDanger} disabled={saving} onClick={() => setPhotoChange({ kind: "remove" })}>Удалить изображение</button>
                  </div> : null}
                </> : !editor.readOnly ? <>
                  <label htmlFor="gift-option-photo" className={styles.giftPollPhotoBlockUpload}>
                    <ImageIcon />
                    <span>Добавить изображение</span>
                  </label>
                  <p className={styles.giftPollPhotoBlockHint}>JPG, PNG или WebP · до 6 МБ</p>
                </> : <p className={styles.giftPollPhotoBlockHint}>Изображение не добавлено.</p>}
                {photoError ? <p className={styles.giftPollModalError} role="alert">{photoError}</p> : null}
                {!editor.readOnly ? <input id="gift-option-photo" className={styles.giftPollPhotoInput} type="file" accept="image/jpeg,image/png,image/webp" disabled={saving} onChange={(event) => { selectPhoto(event.target.files?.[0]); event.target.value = ""; }} /> : null}
              </div>
            </>}
            {error ? <p className={styles.giftPollModalError} role="alert">{error}</p> : null}
          </div>
        </div>
        {!editor.readOnly ? <footer className={`${styles.giftPollModalFooter} ${styles.giftPollOptionModalFooter}`}>
          {!editor.isNew && onDelete ? <button type="button" className={styles.giftPollModalDelete} disabled={saving} onClick={onDelete}>Удалить вариант</button> : null}
          <span className={styles.giftPollModalFooterSpacer} />
          <button type="button" className={styles.giftPollModalCancel} disabled={saving} onClick={requestClose}>Отмена</button>
          <button type="button" className={styles.giftPollModalSubmit} disabled={saving || !canSave} onClick={() => onSave(option, photoChange)}>{saving ? "Сохраняем…" : editor.isNew ? "Добавить вариант" : "Сохранить изменения"}</button>
        </footer> : null}
      </section>
    </div>,
    document.body
  );
};

export const GiftPollSettingsForm = ({ manageToken, recipientName, publicSlug, poll, eligibleVoterCount, collectionIsOpen }: { manageToken: string; recipientName: string; publicSlug: string; poll: GiftPollWithOptions | null; eligibleVoterCount: number; collectionIsOpen: boolean }) => {
  const router = useRouter();
  const [howDialogOpen, setHowDialogOpen] = useState(false);
  const [benefitsOpen, setBenefitsOpen] = useState(false);
  const dialogHistoryActive = useRef(false);
  const [autoSaveVersion, setAutoSaveVersion] = useState(0);
  const [editor, setEditor] = useState<EditorState | null>(null);
  const [editorSaving, setEditorSaving] = useState(false);
  const [editorError, setEditorError] = useState("");
  const [prefillWarning, setPrefillWarning] = useState("");
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [importDraft, setImportDraft] = useState<ImportDraft>(emptyImportDraft);
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const [confirmOpenPoll, setConfirmOpenPoll] = useState(false);
  const [openPollChecked, setOpenPollChecked] = useState(false);
  const [confirmClosePoll, setConfirmClosePoll] = useState(false);
  const [optionToDelete, setOptionToDelete] = useState<EditableOption | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [orderEditorOpen, setOrderEditorOpen] = useState(false);
  const [toast, setToast] = useState("");
  const toastTimer = useRef<number | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const closeFormRef = useRef<HTMLFormElement>(null);
  const reopenFormRef = useRef<HTMLFormElement>(null);
  const optionSaveWasPending = useRef(false);
  const lastSubmittedAutoSaveVersion = useRef(0);
  const lastModeRef = useRef(poll?.mode);
  const [options, setOptions] = useState<EditableOption[]>(poll?.options.map(toEditable) ?? []);
  const [enableState, enableAction, enabling] = useActionState(enableGiftPollAction, initialState);
  const [state, formAction, pending] = useActionState(saveGiftPollAction, initialState);
  const [openState, openAction, opening] = useActionState(openGiftPollAction, initialState);
  const openSettingsStorageKey = `gift-poll-open-settings-${manageToken}`;

  const showToast = useCallback((message: string) => {
    setToast(message);
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(""), 2600);
  }, []);

  const openHowDialog = useCallback(() => {
    if (howDialogOpen) return;
    window.history.pushState({ ...window.history.state, giftPollHowDialog: true }, "");
    dialogHistoryActive.current = true;
    setHowDialogOpen(true);
  }, [howDialogOpen]);
  const closeHowDialog = useCallback(() => {
    if (dialogHistoryActive.current) {
      dialogHistoryActive.current = false;
      window.history.back();
    }
    setHowDialogOpen(false);
  }, []);
  const markForAutoSave = () => setAutoSaveVersion((version) => version + 1);
  const submitAutoSave = useCallback((optionsSnapshot = options) => {
    const form = formRef.current;
    if (pending || !form) return false;
    lastSubmittedAutoSaveVersion.current = autoSaveVersion;
    const optionsPayload = form.elements.namedItem("optionsPayload");
    if (optionsPayload instanceof HTMLInputElement) optionsPayload.value = JSON.stringify(optionsSnapshot);
    form.requestSubmit();
    return true;
  }, [autoSaveVersion, options, pending]);

  const closeEditor = useCallback(() => {
    setEditor(null);
    setEditorSaving(false);
    setEditorError("");
    setPrefillWarning("");
    setConfirmDiscard(false);
  }, []);

  const requestCloseEditor = useCallback((dirty: boolean) => {
    if (editorSaving) return;
    if (!dirty) { closeEditor(); return; }
    setConfirmDiscard(true);
  }, [closeEditor, editorSaving]);

  const openEditorFromImport = useCallback((fields: ImportedGiftFields, sources: GiftFieldSources, partial: boolean) => {
    setImportDraft((current) => ({ ...current, fields, sources, partial }));
    setImportDialogOpen(false);
    setEditor({ option: { id: crypto.randomUUID(), ...fields }, isNew: true, readOnly: false, prefilled: true, fromImport: true });
    setPrefillWarning(partial ? "Не все данные удалось определить. Проверьте карточку перед добавлением." : "");
  }, []);

  const openManualFromImport = useCallback(() => {
    const fields = importDraft.fields ? { ...importDraft.fields } : emptyImportedGiftFields();
    const sources: GiftFieldSources = importDraft.fields ? { ...importDraft.sources } : {};
    if (!fields.productUrl && isSafeHttpUrl(importDraft.rawInput)) {
      fields.productUrl = importDraft.rawInput.trim();
      sources.productUrl = "auto";
    }
    setImportDraft((current) => ({ ...current, fields, sources }));
    setImportDialogOpen(false);
    setEditor({ option: { id: crypto.randomUUID(), ...fields }, isNew: true, readOnly: false, prefilled: isUsableImportResult(fields), fromImport: true });
    setPrefillWarning("");
  }, [importDraft]);

  const handleImportFieldEdit = useCallback((fields: ImportedGiftFields, key: keyof ImportedGiftFields) => {
    setImportDraft((current) => current.fields ? { ...current, fields, sources: { ...current.sources, [key]: "user" as const } } : current);
  }, []);

  useEffect(() => {
    if (!enableState.ok) {
      if (enableState.message) window.sessionStorage.removeItem(openSettingsStorageKey);
      return;
    }
    if (!poll) router.refresh();
  }, [enableState.ok, enableState.message, openSettingsStorageKey, poll, router]);

  useEffect(() => {
    if (!poll || window.sessionStorage.getItem(openSettingsStorageKey) !== "1") return;
    window.sessionStorage.removeItem(openSettingsStorageKey);
    const timeout = window.setTimeout(() => setSettingsOpen(true), 0);
    return () => window.clearTimeout(timeout);
  }, [openSettingsStorageKey, poll]);

  useEffect(() => {
    if (typeof window.matchMedia !== "function") return;
    const mobileLayout = window.matchMedia("(max-width: 767px)");
    const syncDefault = (matches: boolean) => setBenefitsOpen(!matches);
    syncDefault(mobileLayout.matches);
    const onChange = (event: MediaQueryListEvent) => syncDefault(event.matches);
    mobileLayout.addEventListener("change", onChange);
    return () => mobileLayout.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    const onPopState = () => {
      if (!dialogHistoryActive.current) return;
      dialogHistoryActive.current = false;
      setHowDialogOpen(false);
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  useEffect(() => {
    if (!poll) return;
    if (poll.mode === lastModeRef.current) return;
    lastModeRef.current = poll.mode;
    setOptions(poll.options.map(toEditable));
    closeEditor();
  }, [poll, closeEditor]);

  useEffect(() => {
    if (!autoSaveVersion || pending || lastSubmittedAutoSaveVersion.current === autoSaveVersion) return;
    const timeout = window.setTimeout(() => {
      submitAutoSave();
    }, 700);
    return () => window.clearTimeout(timeout);
  }, [autoSaveVersion, pending, submitAutoSave]);

  useEffect(() => {
    if (!editorSaving) return;
    if (pending) { optionSaveWasPending.current = true; return; }
    if (!optionSaveWasPending.current) return;
    optionSaveWasPending.current = false;
    const timeout = window.setTimeout(() => {
      if (state.ok) {
        closeEditor();
        setImportDraft(emptyImportDraft());
        showToast("Вариант сохранён");
        return;
      }
      if (state.message && isLockConflictMessage(state.message)) {
        closeEditor();
        router.refresh();
        showToast("Пока вы редактировали вариант, появился первый голос. Варианты голосования теперь заблокированы.");
        return;
      }
      setEditorSaving(false);
      setEditorError(state.message || "Не удалось сохранить изменения.");
    }, 0);
    return () => window.clearTimeout(timeout);
  }, [pending, editorSaving, state, closeEditor, router, showToast]);

  useEffect(() => {
    if (!openState.ok) return;
    const timeout = window.setTimeout(() => {
      setConfirmOpenPoll(false);
      setOpenPollChecked(false);
      showToast("Голосование открыто");
      router.refresh();
    }, 0);
    return () => window.clearTimeout(timeout);
  }, [openState.ok, router, showToast]);

  useEffect(() => () => { if (toastTimer.current) window.clearTimeout(toastTimer.current); }, []);

  if (!poll) {
    return <div className={styles.giftPollOnboarding}>
      <section className={styles.giftPollEmptyState} aria-labelledby="gift-poll-onboarding-title">
        <header className={styles.giftPollOnboardingHeader}>
          <div className={styles.giftPollEmptyIcon} aria-hidden="true">✦</div>
          <div className={styles.giftPollOnboardingHeading}>
            <h2 id="gift-poll-onboarding-title">Выбор подарка</h2>
            <span>Голосование не включено</span>
          </div>
        </header>
        <p className={styles.giftPollOnboardingIntro}>Участники смогут проголосовать за подарок или бюджет после отправки поздравления. Результаты увидите только вы — получатель не увидит голосование в финальной открытке.</p>

        <div className={styles.giftPollOnboardingScenario} aria-label="Как настроить голосование">
          <article className={styles.giftPollOnboardingStep}>
            <div className={styles.giftPollStepMeta}><span className={styles.giftPollStepNumber}>1</span><span className={styles.giftPollStepIcon}><SwitchIcon /></span></div>
            <div className={styles.giftPollStepCopy}><h3>Включите голосование</h3><p>Участники смогут выбрать подарок или бюджет.</p></div>
          </article>
          <article className={styles.giftPollOnboardingStep}>
            <div className={styles.giftPollStepMeta}><span className={styles.giftPollStepNumber}>2</span><span className={styles.giftPollStepIcon}><GiftIcon /></span></div>
            <div className={styles.giftPollStepCopy}><h3>Добавьте варианты</h3><p>Укажите подарки или ориентировочные суммы.</p></div>
          </article>
          <article className={styles.giftPollOnboardingStep}>
            <div className={styles.giftPollStepMeta}><span className={styles.giftPollStepNumber}>3</span><span className={styles.giftPollStepIcon}><PeopleIcon /></span></div>
            <div className={styles.giftPollStepCopy}><h3>Участники проголосуют после отправки</h3><p>Каждый выберет один вариант. Результаты увидите только вы.</p></div>
          </article>
        </div>

        <div className={styles.giftPollOnboardingActions}>
          <form action={enableAction} aria-busy={enabling}>
            <input type="hidden" name="manageToken" value={manageToken} />
            <button type="submit" className={styles.giftPollEnableButton} disabled={enabling} onClick={() => { window.sessionStorage.setItem(openSettingsStorageKey, "1"); }}>
              {enabling ? <span className={styles.giftPollEnableSpinner} aria-hidden="true" /> : null}
              {enabling ? "Включаем голосование…" : "Включить голосование"}
            </button>
          </form>
          <button type="button" className={styles.giftPollHowButton} onClick={openHowDialog}><HelpIcon />Как это работает</button>
        </div>
        {enableState.message && !enableState.ok ? <p className={styles.giftPollEnableError} role="alert">{enableState.message}</p> : null}
      </section>

      <section className={`${styles.giftPollBenefitsAccordion} ${benefitsOpen ? styles.giftPollBenefitsAccordionOpen : ""}`}>
        <button type="button" className={styles.giftPollBenefitsTrigger} aria-label="Что станет доступно" aria-expanded={benefitsOpen} aria-controls="gift-poll-benefits-content" onClick={() => setBenefitsOpen((current) => !current)}>
          <span className={styles.giftPollBenefitsTriggerCopy}><strong>Что станет доступно</strong><small>Варианты подарка, ориентиры бюджета и приватные результаты.</small></span><ChevronDownIcon />
        </button>
        <div id="gift-poll-benefits-content" className={styles.giftPollBenefitsContent} aria-hidden={!benefitsOpen}>
          <div className={styles.giftPollBenefitList}>
            <article><span><GiftIcon /></span><div><h3>Варианты подарка</h3><p>Несколько вариантов подарка на выбор.</p></div></article>
            <article><span><WalletIcon /></span><div><h3>Ориентир бюджета</h3><p>Несколько сумм для выбора общего ориентира.</p></div></article>
            <article><span><ShieldIcon /></span><div><h3>Результаты только для вас</h3><p>Голоса не попадут в финальную открытку.</p></div></article>
          </div>
        </div>
      </section>
      {howDialogOpen ? <GiftPollHowDialog onClose={closeHowDialog} /> : null}
    </div>;
  }

  const isBudget = poll.mode === "budget";
  const totalVotes = poll.totalVotes;
  const optionsLocked = totalVotes > 0;
  const statusLabel = poll.status === "open" ? "Открыто" : poll.status === "closed" ? "Завершено" : "Черновик";
  const remainingOptionCount = 6 - options.length;
  const canAddOption = !optionsLocked && remainingOptionCount > 0 && poll.status !== "closed";
  const validOptions = options.filter((option) => option.title.trim().length > 0);
  const hasInvalidLinks = options.some((option) => Boolean(option.productUrl) && !option.productUrl.startsWith("https://"));
  const saveState = pending ? "saving" : state.message && !state.ok ? "error" : state.ok || Boolean(poll) ? "saved" : "idle";
  const isPollReady = poll.title.trim().length > 0 && poll.question.trim().length > 0 && validOptions.length >= 2 && !hasInvalidLinks && saveState === "saved";
  const participantUrl = versionInvitationUrl(`/join/${publicSlug}`);

  const copyParticipantLink = async () => {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}${participantUrl}`);
      showToast("Ссылка скопирована");
    } catch {
      showToast("Не удалось скопировать ссылку");
    }
  };

  const removeOption = (id: string) => {
    setOptions((current) => current.filter((option) => option.id !== id));
    markForAutoSave();
  };
  const saveEditorOption = async (updated: EditableOption, photoChange: PendingPhotoChange | undefined) => {
    setEditorError("");
    setEditorSaving(true);
    try {
      let nextOption = updated;
      if (photoChange?.kind === "replace") {
        const data = new FormData();
        data.set("manageToken", manageToken);
        data.set("file", await compressImageFile(photoChange.file).catch(() => photoChange.file));
        const response = await fetch("/api/manage/gift-option-image", { method: "POST", body: data });
        const result = await response.json() as { imageUrl?: string; message?: string };
        if (!response.ok || !result.imageUrl) throw new Error(result.message ?? "Не удалось загрузить изображение. Попробуйте ещё раз.");
        nextOption = { ...nextOption, imageUrl: result.imageUrl };
      } else if (photoChange?.kind === "remove") {
        nextOption = { ...nextOption, imageUrl: "" };
      }
      const optionsSnapshot = editor?.isNew ? [...options, nextOption].slice(0, 6) : options.map((option) => option.id === nextOption.id ? nextOption : option);
      setOptions(optionsSnapshot);
      if (!submitAutoSave(optionsSnapshot)) {
        setEditorSaving(false);
        setEditorError("Не удалось сохранить изменения. Попробуйте ещё раз.");
      }
    } catch (error) {
      setEditorSaving(false);
      setEditorError(error instanceof Error ? error.message : "Не удалось сохранить изменения");
    }
  };

  return (
    <section className={styles.giftPollPage} data-poll-status={poll.status}>
      <form id="gift-poll-settings" ref={formRef} action={formAction} className={styles.giftPollHiddenForm} aria-hidden="true" tabIndex={-1}>
        <input type="hidden" name="manageToken" value={manageToken} />
        <input type="hidden" name="mode" value={poll.mode} />
        <input type="hidden" name="title" value={poll.title} />
        <input type="hidden" name="question" value={poll.question} />
        <input type="hidden" name="closesAt" value={poll.closesAt ?? ""} />
        <input type="hidden" name="optionsPayload" value={JSON.stringify(options)} />
      </form>

      <header className={styles.giftPollOverview}>
        <div className={styles.giftPollOverviewTop}>
          <div className={styles.giftPollOverviewIcon} aria-hidden="true">{isBudget ? <WalletIcon /> : <GiftIcon />}</div>
          <div className={styles.giftPollOverviewCopy}>
            <div className={styles.giftPollOverviewHeading}>
              <h2>Голосование за {isBudget ? "бюджет" : "подарок"}</h2>
              <strong className={poll.status === "open" ? styles.giftPollBadgeOpen : styles.giftPollBadge}>{statusLabel}</strong>
            </div>
            <p>Участники выбирают один из предложенных вариантов после отправки поздравления. Результаты видны только вам — получатель не увидит голосование в финальной открытке.</p>
          </div>
          <div className={styles.giftPollOverviewActions}>
            {collectionIsOpen ? <a className={styles.giftPollPreviewButton} href={participantUrl} target="_blank" rel="noopener noreferrer">Открыть форму участника ↗</a> : <button type="button" className={styles.giftPollPreviewButton} disabled title="Форма участника станет доступна после открытия сбора поздравлений">Открыть форму участника ↗</button>}
            <ActionMenu label="Действия с голосованием">
              <button type="button" role="menuitem" className={styles.actionMenuItem} onClick={() => setSettingsOpen(true)}><MenuEditIcon />Настройки голосования</button>
              {collectionIsOpen ? <button type="button" role="menuitem" className={styles.actionMenuItem} onClick={copyParticipantLink}><ExternalIcon />Скопировать ссылку на форму</button> : null}
              <button type="button" role="menuitem" className={styles.actionMenuItem} onClick={openHowDialog}><HelpIcon />Как это работает</button>
              {poll.status === "closed" ? <><div role="separator" className={styles.actionMenuSeparator} /><button type="button" role="menuitem" className={styles.actionMenuItem} onClick={() => reopenFormRef.current?.requestSubmit()}><SwitchIcon />Возобновить голосование</button></> : null}
            </ActionMenu>
          </div>
        </div>
        <div className={styles.giftPollSummary} aria-label="Сводка голосования">
          <div className={styles.giftPollSummaryItem}><span className={styles.giftPollSummaryIcon}><SwitchIcon /></span><span><small>Сценарий</small><strong>{isBudget ? "Бюджет" : "Подарок"}</strong></span></div>
          <div className={styles.giftPollSummaryItem}><span className={styles.giftPollSummaryIcon}><GiftIcon /></span><span><small>Вариантов</small><strong>{options.length} из 6</strong></span></div>
          <div className={styles.giftPollSummaryItem}><span className={styles.giftPollSummaryIcon}><PeopleIcon /></span><span><small>Участники <VoterInfoPopover /></small><strong className={styles.giftPollParticipantCounts}><span>Голосов: {totalVotes}</span><span>Могут голосовать: {eligibleVoterCount}</span></strong></span></div>
          <div className={styles.giftPollSummaryItem}><span className={styles.giftPollSummaryIcon}><CalendarIcon /></span><span><small>Завершение</small><strong>{formatCloseDate(poll.closesAt)}</strong></span></div>
          <button type="button" className={styles.giftPollSummaryEdit} aria-label="Изменить настройки голосования" title="Изменить настройки голосования" onClick={() => setSettingsOpen(true)}><PencilIcon /></button>
        </div>
        {poll.status === "open" ? <div className={styles.giftPollClosePanel}>
          <div>
            <strong>Готовы подвести итоги?</strong>
            <p>После закрытия новые голоса не принимаются, а участники увидят результаты. Вы сможете выбрать итоговый вариант и продолжить подготовку открытки.</p>
          </div>
          <button type="button" className={styles.giftPollCloseInlineButton} onClick={() => setConfirmClosePoll(true)}><CloseIcon />Закрыть голосование</button>
        </div> : null}
      </header>

      <section className={styles.giftPollOptionsBlock} aria-labelledby="gift-poll-options-title">
        <div className={styles.giftPollOptionsTop}>
          <div>
            <h3 id="gift-poll-options-title">{isBudget ? "Варианты бюджета" : "Варианты подарка"}</h3>
            <p>{optionsLocked ? "Варианты зафиксированы после первого голоса." : remainingOptionCount > 0 ? `Вы можете добавить ещё ${remainingOptionCount} ${pluralOptions(remainingOptionCount)}` : "Добавлено максимальное количество вариантов — 6."}</p>
          </div>
          <div className={styles.giftPollOptionsActions}>
            <button type="button" className={styles.giftPollOrderButton} disabled={optionsLocked || options.length < 2 || poll.status === "closed"} title={optionsLocked ? "Порядок нельзя изменить после первого голоса" : options.length < 2 ? "Для изменения порядка нужно минимум два варианта" : undefined} onClick={() => setOrderEditorOpen(true)}>Изменить порядок</button>
            <button type="button" className={styles.giftPollAddButton} disabled={!canAddOption} title={optionsLocked ? "Варианты нельзя добавлять после первого голоса" : remainingOptionCount <= 0 ? "Добавлено максимальное количество вариантов" : poll.status === "closed" ? "Нельзя добавлять варианты после завершения голосования" : undefined} onClick={() => isBudget ? setEditor({ option: emptyOption(), isNew: true, readOnly: false }) : setImportDialogOpen(true)}>+ Добавить {isBudget ? "сумму" : "вариант"}</button>
          </div>
        </div>
        {optionsLocked && poll.status === "open" ? <p className={styles.giftPollLockNote}><InfoIcon />Получен первый голос. Варианты и их порядок больше нельзя изменять.</p> : null}
        <div className={styles.giftPollOptionList}>
          {!options.length ? <p className={styles.giftPollOptionsEmpty}>{isBudget ? "Добавьте первую сумму для голосования." : "Добавьте первый вариант по ссылке или заполните его вручную."}</p> : null}
          {options.map((option, index) => {
            const votes = poll.votesByOptionId[option.id] ?? 0;
            const percent = totalVotes ? Math.round((votes / totalVotes) * 100) : 0;
            return <article key={option.id} className={`${styles.giftPollOptionEditor} ${isBudget ? styles.giftPollBudgetEditor : ""}`}>
              <header className={styles.giftPollOptionCardHeader}>
                {isBudget ? <div className={styles.giftPollBudgetPreview}><div className={styles.giftPollOptionTitleLine}><strong>{budgetInputValue(option.title) ? `${Number(budgetInputValue(option.title)).toLocaleString("ru-RU")} ₽` : "Сумма не указана"}</strong></div>{option.description ? <span>{option.description}</span> : null}</div> : <>{option.imageUrl ? <img src={option.imageUrl} alt="" className={styles.giftPollOptionThumbnail} /> : <div className={styles.giftPollOptionPlaceholder} aria-hidden="true"><GiftIcon /></div>}<div className={styles.giftPollOptionPreview}><div className={styles.giftPollOptionTitleLine}><strong>{option.title || `Вариант подарка ${index + 1}`}</strong></div>{option.description ? <span>{option.description}</span> : null}<div className={styles.giftPollOptionMeta}>{option.priceLabel ? <em>{priceWithCurrency(option.priceLabel)}</em> : null}{option.productUrl ? <a href={option.productUrl} target="_blank" rel="noreferrer">{productSource(option.productUrl)}</a> : null}</div></div></>}
                <div className={styles.giftPollOptionResult}><strong>{votes}</strong><span>{pluralVotes(votes).split(" ").slice(1).join(" ")}</span></div>
                <div className={styles.giftPollProgress}><strong>{percent}%</strong><span><i style={{ width: `${percent}%` }} /></span></div>
                <div className={styles.giftPollOptionCardActions}>
                  <ActionMenu label={`Действия с вариантом «${option.title || `Вариант ${index + 1}`}»`}>
                    {optionsLocked ? <>
                      <button type="button" role="menuitem" className={styles.actionMenuItem} onClick={() => setEditor({ option, isNew: false, readOnly: true })}><EyeIcon />Посмотреть</button>
                      {option.productUrl ? <button type="button" role="menuitem" className={styles.actionMenuItem} onClick={() => window.open(option.productUrl, "_blank", "noopener")}><ExternalIcon />Открыть ссылку</button> : null}
                    </> : <>
                      <button type="button" role="menuitem" className={styles.actionMenuItem} onClick={() => setEditor({ option, isNew: false, readOnly: false })}><MenuEditIcon />Редактировать</button>
                      {option.productUrl ? <button type="button" role="menuitem" className={styles.actionMenuItem} onClick={() => window.open(option.productUrl, "_blank", "noopener")}><ExternalIcon />Открыть ссылку</button> : null}
                      <div role="separator" className={styles.actionMenuSeparator} />
                      <button type="button" role="menuitem" className={`${styles.actionMenuItem} ${styles.actionMenuItemDanger}`} onClick={() => setOptionToDelete(option)}><MenuDeleteIcon />Удалить</button>
                    </>}
                  </ActionMenu>
                </div>
              </header>
            </article>;
          })}
        </div>
        {poll.status === "open" && !optionsLocked ? <p className={styles.giftPollListNote}><InfoIcon />Пока никто не проголосовал. Голосование появится у участников после отправки поздравления.</p> : null}
      </section>

      {poll.status === "draft" ? <>
        <footer className={styles.giftPollLaunchFooter}>
          <div><strong>{isPollReady ? "Всё готово к запуску голосования" : "Завершите настройку голосования"}</strong><p>{isPollReady ? "После открытия участники смогут выбрать подарок." : saveState === "saving" ? "Сохраняем изменения…" : saveState === "error" ? "Не удалось сохранить изменения. Попробуйте ещё раз." : validOptions.length < 2 ? "Нужно добавить минимум два варианта." : hasInvalidLinks ? "Проверьте формат ссылки на товар: используйте адрес, начинающийся с https://." : "Заполните заголовок и вопрос для участников."}</p></div>
          <button type="button" className={styles.giftPollSaveButton} disabled={!isPollReady} onClick={() => setConfirmOpenPoll(true)}>Открыть голосование</button>
        </footer>
      </> : null}

      {poll.status === "closed" ? <><section className={styles.giftPollDecisionPanel}><h3>Выбор организатора</h3><p>Зафиксируйте вариант после завершения голосования.</p><div className={styles.giftPollDecisionOptions}>{poll.options.map((option) => {
        const selected = poll.selectedOptionId === option.id;
        return <article key={option.id} className={`${styles.giftPollDecisionOption} ${selected ? styles.giftPollDecisionOptionSelected : ""}`}><div><strong>{option.title}</strong>{option.description ? <span>{option.description}</span> : null}{option.priceLabel ? <em>{priceWithCurrency(option.priceLabel)}</em> : null}</div>{selected ? <span className={styles.giftPollDecisionSelectedLabel}>Выбрано</span> : <form action={selectGiftPollOptionAction}><input type="hidden" name="manageToken" value={manageToken} /><input type="hidden" name="pollId" value={poll.id} /><input type="hidden" name="optionId" value={option.id} /><button type="submit" className={styles.giftPollOpenButton}>Выбрать</button></form>}</article>;
      })}</div></section></> : null}

      <form ref={closeFormRef} action={closeGiftPollAction} className={styles.giftPollHiddenForm} aria-hidden="true" tabIndex={-1}>
        <input type="hidden" name="manageToken" value={manageToken} />
        <input type="hidden" name="pollId" value={poll.id} />
      </form>
      <form ref={reopenFormRef} action={reopenGiftPollAction} className={styles.giftPollHiddenForm} aria-hidden="true" tabIndex={-1}>
        <input type="hidden" name="manageToken" value={manageToken} />
        <input type="hidden" name="pollId" value={poll.id} />
      </form>

      {confirmClosePoll ? <ConfirmationDialog
        title="Закрыть голосование?"
        description="Новые голоса и изменения выбора больше не принимаются. Участники увидят результаты с количеством голосов, а вы сможете выбрать итоговый вариант и продолжить подготовку открытки."
        onDismiss={() => setConfirmClosePoll(false)}
        actions={[
          { label: "Отмена", tone: "secondary", onClick: () => setConfirmClosePoll(false) },
          { label: "Закрыть голосование", tone: "primary", onClick: () => { setConfirmClosePoll(false); closeFormRef.current?.requestSubmit(); } }
        ]}
      /> : null}

      {confirmOpenPoll ? <GiftPollOpenDialog
        manageToken={manageToken}
        pollId={poll.id}
        checked={openPollChecked}
        onCheckedChange={setOpenPollChecked}
        action={openAction}
        pending={opening}
        error={openState.message && !openState.ok ? openState.message : ""}
        onClose={() => { setConfirmOpenPoll(false); setOpenPollChecked(false); }}
      /> : null}

      {confirmDiscard ? <ConfirmationDialog
        title="Закрыть без сохранения?"
        description="Внесённые изменения будут потеряны."
        onDismiss={() => setConfirmDiscard(false)}
        actions={[
          { label: "Продолжить редактирование", tone: "secondary", onClick: () => setConfirmDiscard(false) },
          { label: "Выйти без сохранения", tone: "danger", onClick: closeEditor }
        ]}
      /> : null}

      {optionToDelete ? <ConfirmationDialog
        title={`Удалить вариант «${optionToDelete.title}»?`}
        description="Вариант будет удалён из голосования. Это действие нельзя отменить."
        onDismiss={() => setOptionToDelete(null)}
        actions={[
          { label: "Оставить вариант", tone: "secondary", onClick: () => setOptionToDelete(null) },
          { label: "Удалить вариант", tone: "danger", onClick: () => { const id = optionToDelete.id; setOptionToDelete(null); if (editor?.option.id === id) closeEditor(); removeOption(id); } }
        ]}
      /> : null}

      {editor ? <GiftOptionEditorDialog
        mode={poll.mode}
        editor={editor}
        saving={editorSaving}
        error={editorError}
        prefillWarning={prefillWarning}
        onSave={saveEditorOption}
        onDelete={!editor.isNew && !editor.readOnly ? () => setOptionToDelete(editor.option) : undefined}
        onRequestClose={requestCloseEditor}
        onUserEdit={editor.fromImport ? handleImportFieldEdit : undefined}
      /> : null}

      {importDialogOpen ? <GiftOptionImportDialog
        manageToken={manageToken}
        draft={importDraft}
        onRawInputChange={(value) => setImportDraft((current) => ({ ...current, rawInput: value }))}
        onClose={() => setImportDialogOpen(false)}
        onApply={openEditorFromImport}
        onManual={openManualFromImport}
      /> : null}

      {orderEditorOpen ? <GiftPollOrderEditor
        manageToken={manageToken}
        poll={poll}
        onClose={() => setOrderEditorOpen(false)}
        onSaved={(message) => { setOrderEditorOpen(false); showToast(message); }}
      /> : null}

      {settingsOpen ? <GiftPollSettingsDialog
        manageToken={manageToken}
        poll={poll}
        recipientName={recipientName}
        onClose={() => setSettingsOpen(false)}
        onSaved={(message) => { setSettingsOpen(false); showToast(message); router.refresh(); }}
      /> : null}

      {howDialogOpen ? <GiftPollHowDialog onClose={closeHowDialog} /> : null}
      {toast ? <div className={styles.greetingToast} role="status">{toast}</div> : null}
    </section>
  );
};

const GiftPollOpenDialog = ({ manageToken, pollId, checked, onCheckedChange, action, pending, error, onClose }: { manageToken: string; pollId: string; checked: boolean; onCheckedChange: (checked: boolean) => void; action: (payload: FormData) => void; pending: boolean; error: string; onClose: () => void }) => {
  const dialogRef = useRef<HTMLElement>(null);
  useModalFocus(dialogRef, onClose);

  return createPortal(
    <div className={styles.giftPollInfoBackdrop} role="presentation" onPointerDown={(event) => event.target === event.currentTarget && onClose()}>
      <section ref={dialogRef} className={styles.giftPollModal} role="dialog" aria-modal="true" aria-labelledby="gift-poll-open-title" tabIndex={-1}>
        <header className={styles.giftPollModalHeader}>
          <div><span>Выбор подарка</span><h2 id="gift-poll-open-title">Открыть голосование?</h2></div>
          <button type="button" onClick={onClose} aria-label="Отменить открытие голосования"><CloseIcon /></button>
        </header>
        <form action={action} aria-busy={pending}>
          <input type="hidden" name="manageToken" value={manageToken} />
          <input type="hidden" name="pollId" value={pollId} />
          <div className={styles.giftPollModalBody}>
            <p className={styles.giftPollModalText}>После открытия участники смогут голосовать, когда отправят поздравление. До появления первого голоса вы сможете менять настройки и варианты.</p>
            <p className={styles.giftPollOpenWarning}><InfoIcon />После первого голоса изменить варианты, удалить их или поменять порядок будет нельзя.</p>
            <label className={styles.giftPollOpenCheck}><input type="checkbox" checked={checked} onChange={(event) => onCheckedChange(event.target.checked)} /><span>Я проверил варианты и понимаю, что после первого голоса они будут заблокированы.</span></label>
            {error ? <p className={styles.giftPollModalError} role="alert">{error}</p> : null}
          </div>
          <footer className={styles.giftPollModalFooter}>
            <button type="button" className={styles.giftPollModalCancel} disabled={pending} onClick={onClose}>Отмена</button>
            <button type="submit" className={styles.giftPollModalSubmit} disabled={!checked || pending}>{pending ? "Открываем…" : "Открыть голосование"}</button>
          </footer>
        </form>
      </section>
    </div>,
    document.body
  );
};
