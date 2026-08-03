"use client";

/* eslint-disable @next/next/no-img-element */

import { useActionState, useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import type { GiftPollWithOptions } from "@/lib/gift-polls/types";
import { defaultGiftPollCopy, isSystemDefaultPollQuestion, isSystemDefaultPollTitle } from "@/lib/gift-polls/validation";
import { compressImageFile } from "@/lib/media/image-compression";
import { closeGiftPollAction, enableGiftPollAction, openGiftPollAction, saveGiftPollAction, saveGiftPollSettingsAction, selectGiftPollOptionAction, type GiftPollFormState } from "./actions";
import { ConfirmationDialog } from "./confirmation-dialog";
import { useModalFocus } from "./use-modal-focus";
import styles from "./manage-page.module.css";

type Mode = "gift" | "budget";
type EditableOption = { id: string; title: string; description: string; imageUrl: string; priceLabel: string; productUrl: string };
type PendingPhotoChange = { kind: "replace"; file: File; previewUrl: string; uploadedUrl?: string } | { kind: "remove" };
const sameOption = (left: EditableOption, right: EditableOption) => left.title === right.title && left.description === right.description && left.imageUrl === right.imageUrl && left.priceLabel === right.priceLabel && left.productUrl === right.productUrl;
const emptyOption = (): EditableOption => ({ id: crypto.randomUUID(), title: "", description: "", imageUrl: "", priceLabel: "", productUrl: "" });
const toEditable = (option: GiftPollWithOptions["options"][number]): EditableOption => ({
  id: option.id, title: option.title, description: option.description ?? "", imageUrl: option.imageUrl ?? "", priceLabel: option.priceLabel ?? "", productUrl: option.productUrl ?? ""
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

export const GIFT_POLL_SETTINGS_EVENT = "slovesto:open-gift-poll-settings";
export const requestGiftPollSettings = () => window.dispatchEvent(new CustomEvent(GIFT_POLL_SETTINGS_EVENT));

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
const DotsIcon = () => <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="5" cy="12" r="1.8" /><circle cx="12" cy="12" r="1.8" /><circle cx="19" cy="12" r="1.8" /></svg>;
const InfoIcon = () => <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="M12 10.5v5M12 7h.01" /></svg>;
const ExternalIcon = () => <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14 4h6v6M20 4 11 13M9 5H6a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2v-3" /></svg>;

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

const GiftMenu = ({ label, buttonClassName, children }: { label: string; buttonClassName?: string; children: ReactNode }) => {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => { if (!rootRef.current?.contains(event.target as Node)) setOpen(false); };
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === "Escape") setOpen(false); };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return <div ref={rootRef} className={styles.giftMenu}>
    <button type="button" className={buttonClassName ?? styles.giftMenuTrigger} aria-haspopup="menu" aria-expanded={open} aria-label={label} title={label} onClick={() => setOpen((current) => !current)}><DotsIcon /></button>
    {open ? <div role="menu" className={styles.giftMenuList} onClick={(event) => { if ((event.target as HTMLElement).closest("button:not([disabled])")) setOpen(false); }}>{children}</div> : null}
  </div>;
};

const GiftPollSettingsDialog = ({ manageToken, poll, recipientName, onClose, onSaved }: { manageToken: string; poll: GiftPollWithOptions; recipientName: string; onClose: () => void; onSaved: (message: string) => void }) => {
  const dialogRef = useRef<HTMLElement>(null);
  useModalFocus(dialogRef, onClose);
  const locked = poll.totalVotes > 0;
  const [mode, setMode] = useState<Mode>(poll.mode);
  const [title, setTitle] = useState(poll.title);
  const [question, setQuestion] = useState(poll.question);
  const [closesAt, setClosesAt] = useState(toDateTimeLocal(poll.closesAt));
  const [state, formAction, pending] = useActionState(saveGiftPollSettingsAction, initialState);

  useEffect(() => {
    if (state.ok) onSaved(state.message || "Настройки голосования сохранены.");
  }, [state, onSaved]);

  const changeMode = (nextMode: Mode) => {
    if (locked || nextMode === mode) return;
    const nextDefaults = defaultGiftPollCopy(nextMode);
    if (isSystemDefaultPollTitle(title, mode)) setTitle(nextDefaults.title);
    if (isSystemDefaultPollQuestion(question, mode, recipientName)) setQuestion(nextDefaults.question);
    setMode(nextMode);
  };

  return createPortal(
    <div className={styles.giftPollInfoBackdrop} role="presentation" onPointerDown={(event) => event.target === event.currentTarget && onClose()}>
      <section ref={dialogRef} className={styles.giftPollModal} role="dialog" aria-modal="true" aria-labelledby="gift-poll-settings-title" tabIndex={-1}>
        <header className={styles.giftPollModalHeader}>
          <div><span>Выбор подарка</span><h2 id="gift-poll-settings-title">Настройки голосования</h2></div>
          <button type="button" onClick={onClose} aria-label="Закрыть настройки"><CloseIcon /></button>
        </header>
        <form action={formAction} className={styles.giftPollModalForm} aria-busy={pending}>
          <input type="hidden" name="manageToken" value={manageToken} />
          <input type="hidden" name="pollId" value={poll.id} />
          <input type="hidden" name="mode" value={mode} />
          <div className={styles.giftPollModalBody}>
            <fieldset className={styles.giftPollModeFieldset}>
              <legend>Сценарий</legend>
              <div className={styles.giftPollModeChoices}>
                <label className={`${mode === "gift" ? styles.giftPollModeActive : ""} ${locked ? styles.giftPollModeDisabled : ""}`}><input type="radio" name="modeChoice" value="gift" checked={mode === "gift"} disabled={locked} onChange={() => changeMode("gift")} /><span className={styles.giftPollModeIcon}><GiftIcon /></span><span><strong>Подарок</strong><small>Один из конкретных вариантов</small></span></label>
                <label className={`${mode === "budget" ? styles.giftPollModeActive : ""} ${locked ? styles.giftPollModeDisabled : ""}`}><input type="radio" name="modeChoice" value="budget" checked={mode === "budget"} disabled={locked} onChange={() => changeMode("budget")} /><span className={styles.giftPollModeIcon}><WalletIcon /></span><span><strong>Бюджет</strong><small>Подходящий уровень общей суммы</small></span></label>
              </div>
              {mode !== poll.mode && poll.options.length > 0 ? <p className={styles.giftPollModeHint}>При смене сценария текущие варианты будут удалены.</p> : null}
            </fieldset>
            <label className={styles.giftPollField}>Заголовок голосования<input name="title" value={title} readOnly={locked} maxLength={80} required onChange={(event) => setTitle(event.target.value)} /><small>{title.length} / 80</small></label>
            <label className={styles.giftPollField}>Вопрос для участников<input name="question" value={question} readOnly={locked} maxLength={180} required onChange={(event) => setQuestion(event.target.value)} /><small>{question.length} / 180</small></label>
            {locked ? <p className={styles.giftPollLockedNote}>Настройку нельзя изменить после получения первого голоса.</p> : null}
            <label className={styles.giftPollField}>Завершение голосования<span>Оставьте пустым, чтобы закрыть голосование вручную.</span><input type="datetime-local" name="closesAt" value={closesAt} onChange={(event) => setClosesAt(event.target.value)} /></label>
            {state.message && !state.ok ? <p className={styles.giftPollModalError} role="alert">{state.message}</p> : null}
          </div>
          <footer className={styles.giftPollModalFooter}>
            <button type="button" className={styles.giftPollModalCancel} disabled={pending} onClick={onClose}>Отмена</button>
            <button type="submit" className={styles.giftPollModalSubmit} disabled={pending || !title.trim() || !question.trim()}>{pending ? "Сохраняем…" : "Сохранить настройки"}</button>
          </footer>
        </form>
      </section>
    </div>,
    document.body
  );
};

const GiftOptionImportStep = ({ manageToken, onPrefill, onManual }: { manageToken: string; onPrefill: (option: EditableOption) => void; onManual: () => void }) => {
  const [rawInput, setRawInput] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const importLink = async () => {
    if (!rawInput.trim()) return;
    setStatus("loading");
    try {
      const response = await fetch("/api/manage/gift-poll-preview", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ manageToken, rawInput }) });
      const data = await response.json() as { extractedUrl?: string; resolvedUrl?: string; metadata?: { title: string | null; description: string | null; imageUrl: string | null; price: { amount: number; currency: string } | null } };
      if (!response.ok || !data.extractedUrl) { setStatus("error"); return; }
      onPrefill({ id: crypto.randomUUID(), title: data.metadata?.title ?? "", description: data.metadata?.description ?? "", productUrl: data.resolvedUrl ?? data.extractedUrl, imageUrl: data.metadata?.imageUrl ?? "", priceLabel: data.metadata?.price ? new Intl.NumberFormat("ru-RU").format(data.metadata.price.amount) : "" });
    } catch { setStatus("error"); }
  };
  return <div className={styles.giftPollImportStep}>
    <label className={styles.giftPollField}>Ссылка или текст из магазина<textarea value={rawInput} disabled={status === "loading"} onChange={(event) => setRawInput(event.target.value)} placeholder="Вставьте ссылку или описание товара из магазина" /></label>
    {status === "error" ? <p className={styles.giftPollModalError} role="alert">Не удалось автоматически заполнить карточку. Проверьте ссылку или добавьте вариант вручную.</p> : null}
    <div className={styles.giftPollImportActions}>
      <button type="button" className={styles.giftPollImportButton} disabled={status === "loading" || !rawInput.trim()} onClick={importLink}>{status === "loading" ? "Заполняем карточку…" : status === "error" ? "Попробовать ещё раз" : "Заполнить карточку"}</button>
      <button type="button" className={styles.giftPollManualAddButton} disabled={status === "loading"} onClick={onManual}>Добавить вручную</button>
    </div>
  </div>;
};

type EditorState = { option: EditableOption; isNew: boolean; readOnly: boolean };

const GiftOptionEditorDialog = ({ manageToken, mode, editor, saving, error, onSave, onRequestClose }: { manageToken: string; mode: Mode; editor: EditorState; saving: boolean; error: string; onSave: (option: EditableOption, photoChange: PendingPhotoChange | undefined) => void; onRequestClose: (dirty: boolean) => void }) => {
  const dialogRef = useRef<HTMLElement>(null);
  const [option, setOption] = useState<EditableOption>(editor.option);
  const [photoChange, setPhotoChange] = useState<PendingPhotoChange | undefined>(undefined);
  const [view, setView] = useState<"import" | "form">(editor.isNew && mode === "gift" && !editor.readOnly ? "import" : "form");
  const isBudget = mode === "budget";
  const dirty = !sameOption(option, editor.option) || Boolean(photoChange);
  const canSave = option.title.trim().length > 0 && (editor.isNew ? true : dirty);
  const requestClose = useCallback(() => onRequestClose(editor.readOnly ? false : dirty), [onRequestClose, editor.readOnly, dirty]);
  useModalFocus(dialogRef, requestClose);

  const patch = (key: keyof EditableOption, value: string) => setOption((current) => ({ ...current, [key]: value }));

  return createPortal(
    <div className={styles.giftPollInfoBackdrop} role="presentation" onPointerDown={(event) => event.target === event.currentTarget && requestClose()}>
      <section ref={dialogRef} className={`${styles.giftPollModal} ${styles.giftPollOptionModal}`} role="dialog" aria-modal="true" aria-labelledby="gift-option-editor-title" tabIndex={-1}>
        <header className={styles.giftPollModalHeader}>
          <div><span>{isBudget ? "Вариант бюджета" : "Вариант подарка"}</span><h2 id="gift-option-editor-title">{editor.readOnly ? "Просмотр варианта" : editor.isNew ? "Добавить вариант" : "Редактирование варианта"}</h2></div>
          <button type="button" onClick={requestClose} aria-label="Закрыть редактор"><CloseIcon /></button>
        </header>
        <div className={styles.giftPollModalBody}>
          {view === "import" ? <GiftOptionImportStep manageToken={manageToken} onPrefill={(prefilled) => { setOption({ ...editor.option, ...prefilled, id: editor.option.id }); setView("form"); }} onManual={() => setView("form")} /> : (
            <div className={styles.giftPollOptionForm}>
              {isBudget ? <>
                <label className={styles.giftPollField}>Сумма, ₽<input readOnly={editor.readOnly} value={budgetInputValue(option.title)} type="number" inputMode="numeric" min="1" max="9999999" required onChange={(event) => patch("title", event.target.value)} placeholder="Например, 5000" /></label>
                <label className={styles.giftPollField}>Пояснение <span>необязательно</span><input readOnly={editor.readOnly} value={option.description} maxLength={140} onChange={(event) => patch("description", event.target.value)} placeholder="Например, небольшой общий подарок" /></label>
              </> : <>
                <label className={styles.giftPollField}>Название<input readOnly={editor.readOnly} value={option.title} maxLength={60} required onChange={(event) => patch("title", event.target.value)} placeholder="Например, сертификат в SPA" /></label>
                <label className={styles.giftPollField}>Примерная стоимость <span>необязательно</span><input readOnly={editor.readOnly} value={option.priceLabel} maxLength={30} onChange={(event) => patch("priceLabel", event.target.value)} placeholder="Например, около 5 000 ₽" /></label>
                <label className={styles.giftPollField}>Короткое описание <span>необязательно</span><input readOnly={editor.readOnly} value={option.description} maxLength={140} onChange={(event) => patch("description", event.target.value)} placeholder="Например, можно выбрать удобный день и программу" /></label>
                <label className={styles.giftPollField}>Ссылка на товар <span>необязательно</span><input readOnly={editor.readOnly} value={option.productUrl} inputMode="url" onChange={(event) => patch("productUrl", event.target.value)} placeholder="https://…" /></label>
                {option.productUrl.startsWith("https://") ? <a className={styles.giftPollOpenProductLink} href={option.productUrl} target="_blank" rel="noopener noreferrer">Открыть ссылку ↗</a> : null}
                <div className={styles.giftPollPhotoEditor}>
                  <strong>Фото <span>необязательно</span></strong>
                  {photoChange?.kind === "replace" ? <>
                    <img src={photoChange.previewUrl} alt="Новое выбранное фото" className={styles.giftPollPhotoPreview} />
                    <p>Файл будет загружен после сохранения изменений.</p>
                    {!editor.readOnly ? <div className={styles.giftPollPhotoActions}><label htmlFor="gift-option-photo" className={styles.giftPollPhotoChoose}>Выбрать другое</label><button type="button" className={styles.giftPollPhotoRemove} onClick={() => { URL.revokeObjectURL(photoChange.previewUrl); setPhotoChange(undefined); }}>Отменить замену</button></div> : null}
                  </> : photoChange?.kind === "remove" ? <>
                    <p>Фото будет удалено после сохранения изменений.</p>
                    {!editor.readOnly ? <button type="button" className={styles.giftPollPhotoRemove} onClick={() => setPhotoChange(undefined)}>Отменить удаление</button> : null}
                  </> : option.imageUrl ? <>
                    <img src={option.imageUrl} alt={`Текущее фото: ${option.title || "вариант подарка"}`} className={styles.giftPollPhotoPreview} />
                    {!editor.readOnly ? <div className={styles.giftPollPhotoActions}><label htmlFor="gift-option-photo" className={styles.giftPollPhotoChoose}>Заменить фото</label><button type="button" className={styles.giftPollPhotoRemove} onClick={() => setPhotoChange({ kind: "remove" })}>Удалить фото</button></div> : null}
                  </> : !editor.readOnly ? <label htmlFor="gift-option-photo" className={styles.giftPollPhotoChoose}>Выбрать фото</label> : <p>Фото не добавлено.</p>}
                  {!editor.readOnly ? <input id="gift-option-photo" className={styles.giftPollPhotoInput} type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => { const file = event.target.files?.[0]; if (!file) return; if (photoChange?.kind === "replace") URL.revokeObjectURL(photoChange.previewUrl); setPhotoChange({ kind: "replace", file, previewUrl: URL.createObjectURL(file) }); event.target.value = ""; }} /> : null}
                </div>
              </>}
              {error ? <p className={styles.giftPollModalError} role="alert">{error}</p> : null}
            </div>
          )}
        </div>
        {view === "form" && !editor.readOnly ? <footer className={styles.giftPollModalFooter}>
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
  const [draggedOptionId, setDraggedOptionId] = useState<string | null>(null);
  const [autoSaveVersion, setAutoSaveVersion] = useState(0);
  const [editor, setEditor] = useState<EditorState | null>(null);
  const [editorSaving, setEditorSaving] = useState(false);
  const [editorError, setEditorError] = useState("");
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const [confirmOpenPoll, setConfirmOpenPoll] = useState(false);
  const [openPollChecked, setOpenPollChecked] = useState(false);
  const [confirmClosePoll, setConfirmClosePoll] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [toast, setToast] = useState("");
  const toastTimer = useRef<number | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const closeFormRef = useRef<HTMLFormElement>(null);
  const optionSaveWasPending = useRef(false);
  const lastSubmittedAutoSaveVersion = useRef(0);
  const lastModeRef = useRef(poll?.mode);
  const [options, setOptions] = useState<EditableOption[]>(poll?.options.map(toEditable) ?? []);
  const [enableState, enableAction, enabling] = useActionState(enableGiftPollAction, initialState);
  const [state, formAction, pending] = useActionState(saveGiftPollAction, initialState);
  const [openState, openAction, opening] = useActionState(openGiftPollAction, initialState);

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
    setConfirmDiscard(false);
  }, []);

  const requestCloseEditor = useCallback((dirty: boolean) => {
    if (!dirty) { closeEditor(); return; }
    setConfirmDiscard(true);
  }, [closeEditor]);

  useEffect(() => {
    if (enableState.ok && !poll) router.refresh();
  }, [enableState.ok, poll, router]);

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
    const open = () => setSettingsOpen(true);
    window.addEventListener(GIFT_POLL_SETTINGS_EVENT, open);
    return () => window.removeEventListener(GIFT_POLL_SETTINGS_EVENT, open);
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
            <button type="submit" className={styles.giftPollEnableButton} disabled={enabling}>
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
            <article><span><GiftIcon /></span><div><h3>Варианты подарка</h3><p>Несколько подарков на выбор или вариант «Другое».</p></div></article>
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
  const participantUrl = `/join/${publicSlug}`;

  const copyParticipantLink = async () => {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}${participantUrl}`);
      showToast("Ссылка скопирована");
    } catch {
      showToast("Не удалось скопировать ссылку");
    }
  };

  const moveOption = (index: number, direction: -1 | 1) => {
    setOptions((current) => {
      const nextIndex = index + direction;
      if (nextIndex < 0 || nextIndex >= current.length) return current;
      const next = [...current];
      [next[index], next[nextIndex]] = [next[nextIndex], next[index]];
      return next;
    });
    markForAutoSave();
  };
  const moveOptionTo = (sourceId: string, targetId: string) => {
    setOptions((current) => {
      const sourceIndex = current.findIndex((option) => option.id === sourceId);
      const targetIndex = current.findIndex((option) => option.id === targetId);
      if (sourceIndex < 0 || targetIndex < 0 || sourceIndex === targetIndex) return current;
      const next = [...current];
      const [source] = next.splice(sourceIndex, 1);
      next.splice(targetIndex, 0, source);
      return next;
    });
    markForAutoSave();
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
        if (!response.ok || !result.imageUrl) throw new Error(result.message ?? "Не удалось загрузить фото");
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
            <GiftMenu label="Действия с голосованием">
              <button type="button" role="menuitem" className={styles.giftMenuItem} onClick={() => setSettingsOpen(true)}><PencilIcon />Настройки голосования</button>
              {collectionIsOpen ? <button type="button" role="menuitem" className={styles.giftMenuItem} onClick={copyParticipantLink}><ExternalIcon />Скопировать ссылку на форму</button> : null}
              {poll.status === "open" ? <button type="button" role="menuitem" className={`${styles.giftMenuItem} ${styles.giftMenuItemDanger}`} onClick={() => setConfirmClosePoll(true)}><CloseIcon />Закрыть голосование</button> : null}
              <button type="button" role="menuitem" className={styles.giftMenuItem} onClick={openHowDialog}><HelpIcon />Как это работает</button>
            </GiftMenu>
          </div>
        </div>
        <div className={styles.giftPollSummary} aria-label="Сводка голосования">
          <div className={styles.giftPollSummaryItem}><span className={styles.giftPollSummaryIcon}><SwitchIcon /></span><span><small>Сценарий</small><strong>{isBudget ? "Бюджет" : "Подарок"}</strong></span></div>
          <div className={styles.giftPollSummaryItem}><span className={styles.giftPollSummaryIcon}><GiftIcon /></span><span><small>Вариантов</small><strong>{options.length} из 6</strong></span></div>
          <div className={styles.giftPollSummaryItem}><span className={styles.giftPollSummaryIcon}><PeopleIcon /></span><span><small>Проголосовали</small><strong>{eligibleVoterCount > 0 ? `${totalVotes} из ${eligibleVoterCount}` : `${totalVotes}`}</strong></span></div>
          <div className={styles.giftPollSummaryItem}><span className={styles.giftPollSummaryIcon}><CalendarIcon /></span><span><small>Завершение</small><strong>{formatCloseDate(poll.closesAt)}</strong></span></div>
          <button type="button" className={styles.giftPollSummaryEdit} aria-label="Изменить настройки голосования" title="Изменить настройки голосования" onClick={() => setSettingsOpen(true)}><PencilIcon /></button>
        </div>
      </header>

      <section className={styles.giftPollOptionsBlock} aria-labelledby="gift-poll-options-title">
        <div className={styles.giftPollOptionsTop}>
          <div>
            <h3 id="gift-poll-options-title">{isBudget ? "Варианты бюджета" : "Варианты подарка"}</h3>
            <p>{optionsLocked ? "Варианты зафиксированы после первого голоса." : remainingOptionCount > 0 ? `Вы можете добавить ещё ${remainingOptionCount} ${pluralOptions(remainingOptionCount)}` : "Добавлено максимальное количество вариантов — 6."}</p>
          </div>
          {canAddOption ? <button type="button" className={styles.giftPollAddButton} onClick={() => setEditor({ option: emptyOption(), isNew: true, readOnly: false })}>+ Добавить {isBudget ? "сумму" : "вариант"}</button> : null}
        </div>
        {optionsLocked && poll.status === "open" ? <p className={styles.giftPollLockNote}><InfoIcon />Получен первый голос. Варианты и их порядок больше нельзя изменять.</p> : null}
        <div className={styles.giftPollOptionList}>
          {!options.length ? <p className={styles.giftPollOptionsEmpty}>{isBudget ? "Добавьте первую сумму для голосования." : "Добавьте первый вариант по ссылке или заполните его вручную."}</p> : null}
          {options.map((option, index) => {
            const votes = poll.votesByOptionId[option.id] ?? 0;
            const percent = totalVotes ? Math.round((votes / totalVotes) * 100) : 0;
            return <article key={option.id} onDragOver={(event) => event.preventDefault()} onDrop={() => { if (draggedOptionId && !optionsLocked) moveOptionTo(draggedOptionId, option.id); setDraggedOptionId(null); }} onDragEnd={() => setDraggedOptionId(null)} className={`${styles.giftPollOptionEditor} ${isBudget ? styles.giftPollBudgetEditor : ""} ${draggedOptionId === option.id ? styles.giftPollOptionDragging : ""}`}>
              <header className={styles.giftPollOptionCardHeader}>
                {!optionsLocked ? <span className={styles.giftPollDragHint} draggable onDragStart={() => setDraggedOptionId(option.id)} aria-label="Перетащите, чтобы изменить порядок">⠿</span> : null}
                {isBudget ? <div className={styles.giftPollBudgetPreview}><div className={styles.giftPollOptionTitleLine}><strong>{budgetInputValue(option.title) ? `${Number(budgetInputValue(option.title)).toLocaleString("ru-RU")} ₽` : "Сумма не указана"}</strong></div>{option.description ? <span>{option.description}</span> : null}</div> : <>{option.imageUrl ? <img src={option.imageUrl} alt="" className={styles.giftPollOptionThumbnail} /> : <div className={styles.giftPollOptionPlaceholder} aria-hidden="true"><GiftIcon /></div>}<div className={styles.giftPollOptionPreview}><div className={styles.giftPollOptionTitleLine}><strong>{option.title || `Вариант подарка ${index + 1}`}</strong></div>{option.description ? <span>{option.description}</span> : null}<div className={styles.giftPollOptionMeta}>{option.priceLabel ? <em>{priceWithCurrency(option.priceLabel)}</em> : null}{option.productUrl ? <a href={option.productUrl} target="_blank" rel="noreferrer">{productSource(option.productUrl)}</a> : null}</div></div></>}
                <div className={styles.giftPollOptionResult}><strong>{votes}</strong><span>{pluralVotes(votes).split(" ").slice(1).join(" ")}</span></div>
                <div className={styles.giftPollProgress}><strong>{percent}%</strong><span><i style={{ width: `${percent}%` }} /></span></div>
                <div className={styles.giftPollOptionCardActions}>
                  <GiftMenu label={`Действия с вариантом «${option.title || `Вариант ${index + 1}`}»`}>
                    {optionsLocked ? <>
                      <button type="button" role="menuitem" className={styles.giftMenuItem} onClick={() => setEditor({ option, isNew: false, readOnly: true })}><EyeIcon />Посмотреть</button>
                      {option.productUrl ? <button type="button" role="menuitem" className={styles.giftMenuItem} onClick={() => window.open(option.productUrl, "_blank", "noopener")}><ExternalIcon />Открыть ссылку</button> : null}
                    </> : <>
                      <button type="button" role="menuitem" className={styles.giftMenuItem} onClick={() => setEditor({ option, isNew: false, readOnly: false })}><PencilIcon />Редактировать</button>
                      {option.productUrl ? <button type="button" role="menuitem" className={styles.giftMenuItem} onClick={() => window.open(option.productUrl, "_blank", "noopener")}><ExternalIcon />Открыть ссылку</button> : null}
                      <button type="button" role="menuitem" className={styles.giftMenuItem} disabled={index === 0} onClick={() => moveOption(index, -1)}>↑ Переместить выше</button>
                      <button type="button" role="menuitem" className={styles.giftMenuItem} disabled={index === options.length - 1} onClick={() => moveOption(index, 1)}>↓ Переместить ниже</button>
                      <button type="button" role="menuitem" className={`${styles.giftMenuItem} ${styles.giftMenuItemDanger}`} onClick={() => removeOption(option.id)}><CloseIcon />Удалить</button>
                    </>}
                  </GiftMenu>
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

      {confirmClosePoll ? <ConfirmationDialog
        title="Закрыть голосование?"
        description="Участники больше не смогут голосовать или менять свой выбор. Результаты сохранятся."
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
        title={editor?.isNew ? "Отменить добавление?" : "Закрыть без сохранения?"}
        description="Внесённые изменения будут потеряны."
        onDismiss={() => setConfirmDiscard(false)}
        actions={[
          { label: "Продолжить редактирование", tone: "secondary", onClick: () => setConfirmDiscard(false) },
          { label: editor?.isNew ? "Отменить добавление" : "Закрыть без сохранения", tone: "danger", onClick: closeEditor }
        ]}
      /> : null}

      {editor ? <GiftOptionEditorDialog
        manageToken={manageToken}
        mode={poll.mode}
        editor={editor}
        saving={editorSaving}
        error={editorError}
        onSave={saveEditorOption}
        onRequestClose={requestCloseEditor}
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
