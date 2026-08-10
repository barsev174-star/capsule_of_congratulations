"use client";

import { useMemo, useRef, useState, useTransition, type FormEvent, type MouseEvent } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import type { Contribution } from "@/lib/cards/types";
import {
  CONTRIBUTION_MESSAGE_MAX_LENGTH,
  CONTRIBUTION_MESSAGE_RECOMMENDED_LENGTH
} from "@/lib/contributions/limits";
import { AiHelper } from "@/app/card/[publicSlug]/ai-helper";
import {
  deleteContributionAction,
  saveOrganizerContributionAction
} from "./actions";
import { ConfirmationDialog } from "./confirmation-dialog";
import styles from "./manage-page.module.css";
import { useModalFocus } from "./use-modal-focus";

type Props = {
  cardId: string;
  manageToken: string;
  occasionText: string;
  contribution?: Contribution;
  isMainGreeting: boolean;
  greetingMode?: "classic" | "matrix" | "ladder";
  initialMode?: "manual" | "ai";
  onClose: () => void;
  onSaved: (contributionId: string, feedback?: string) => void;
  onDeleted: () => void;
};

type RequiredField = "authorName" | "authorRole" | "message";
type FieldFlags = Record<RequiredField, boolean>;

const emptyFieldFlags: FieldFlags = { authorName: false, authorRole: false, message: false };

const initialState = { ok: false, message: "" };

const LockIcon = () => (
  <svg viewBox="0 0 20 20" aria-hidden="true">
    <rect x="4.5" y="8.5" width="11" height="8" rx="2" />
    <path d="M7 8.5V6a3 3 0 0 1 6 0v2.5" />
  </svg>
);

const normalizeSnapshot = (snapshot: {
  authorName: string;
  authorRole: string;
  message: string;
  isVisible: boolean;
  isMain: boolean;
  aiDraft: string;
  aiGenerationIds: string[];
}) => JSON.stringify({
  ...snapshot,
  authorName: snapshot.authorName.trim(),
  authorRole: snapshot.authorRole.trim(),
  message: snapshot.message.trim(),
  aiDraft: snapshot.aiDraft.trim(),
  aiGenerationIds: [...snapshot.aiGenerationIds].sort()
});

export const ContributionEditor = ({
  cardId,
  manageToken,
  occasionText,
  contribution,
  isMainGreeting,
  greetingMode = "classic",
  initialMode = "manual",
  onClose,
  onSaved,
  onDeleted
}: Props) => {
  const router = useRouter();
  const dialogRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const [authorName, setAuthorName] = useState(contribution?.authorName ?? "");
  const [authorRole, setAuthorRole] = useState(contribution?.authorRole ?? "");
  const [message, setMessage] = useState(contribution?.message ?? "");
  const [mode, setMode] = useState<"manual" | "ai">(initialMode);
  const [aiGenerationIds, setAiGenerationIds] = useState<string[]>([]);
  const [aiDraft, setAiDraft] = useState("");
  const [hasAiReplacement, setHasAiReplacement] = useState(false);
  const [isVisible, setIsVisible] = useState(contribution?.status !== "hidden");
  const [isMain, setIsMain] = useState(isMainGreeting);
  const [confirmation, setConfirmation] = useState<"close" | "delete" | null>(null);
  const [error, setError] = useState("");
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [editedFields, setEditedFields] = useState<FieldFlags>(emptyFieldFlags);
  const [blurredFields, setBlurredFields] = useState<FieldFlags>(emptyFieldFlags);
  const [isPending, startTransition] = useTransition();
  const initialSnapshot = useMemo(() => normalizeSnapshot({
    authorName: contribution?.authorName ?? "",
    authorRole: contribution?.authorRole ?? "",
    message: contribution?.message ?? "",
    isVisible: contribution?.status !== "hidden",
    isMain: isMainGreeting,
    aiDraft: "",
    aiGenerationIds: []
  }), [contribution, isMainGreeting]);
  const currentSnapshot = normalizeSnapshot({
    authorName,
    authorRole,
    message,
    isVisible,
    isMain,
    aiDraft,
    aiGenerationIds
  });
  const isDirty = currentSnapshot !== initialSnapshot;
  const fieldValidity: FieldFlags = {
    authorName: authorName.trim().length >= 2,
    authorRole: authorRole.trim().length > 0,
    message: message.trim().length >= 20
  };
  const canSubmit = fieldValidity.authorName && fieldValidity.authorRole && fieldValidity.message;
  const shouldShowFieldError = (field: RequiredField, value: string) => (
    !fieldValidity[field]
    && (submitAttempted || blurredFields[field] || (editedFields[field] && value.trim().length === 0))
  );
  const authorNameError = shouldShowFieldError("authorName", authorName);
  const authorRoleError = shouldShowFieldError("authorRole", authorRole);
  const messageError = shouldShowFieldError("message", message);
  const title = contribution ? "Редактировать поздравление" : "Добавить поздравление";

  const markEdited = (field: RequiredField) => {
    setEditedFields((current) => current[field] ? current : { ...current, [field]: true });
  };

  const markBlurredAfterEdit = (field: RequiredField) => {
    if (!editedFields[field]) return;
    setBlurredFields((current) => current[field] ? current : { ...current, [field]: true });
  };

  const requestClose = () => {
    if (confirmation) return;
    if (isDirty) setConfirmation("close");
    else onClose();
  };

  useModalFocus(dialogRef, requestClose);

  const save = (form: HTMLFormElement) => {
    setError("");
    const formData = new FormData(form);
    startTransition(async () => {
      const result = await saveOrganizerContributionAction(initialState, formData);
      if (!result.ok || !result.contributionId) {
        setError(result.message || "Не удалось сохранить поздравление.");
        return;
      }
      router.refresh();
      const feedback = !contribution
        ? "Поздравление добавлено"
        : !isMainGreeting && isMain
          ? "Поздравление назначено главным"
          : contribution.status === "visible" && !isVisible
            ? "Поздравление скрыто"
            : "Изменения сохранены";
      onSaved(result.contributionId, feedback);
    });
  };

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canSubmit) {
      setSubmitAttempted(true);
      return;
    }
    save(event.currentTarget);
  };

  const saveFromConfirmation = () => {
    const form = formRef.current;
    if (!form) return;
    setConfirmation(null);
    if (!canSubmit) {
      setSubmitAttempted(true);
      return;
    }
    save(form);
  };

  const removeContribution = () => {
    if (!contribution) return;
    setError("");
    startTransition(async () => {
      const formData = new FormData();
      formData.set("manageToken", manageToken);
      formData.set("contributionId", contribution.id);
      await deleteContributionAction(formData);
      router.refresh();
      onDeleted();
    });
  };

  const handleBackdrop = (event: MouseEvent<HTMLDivElement>) => {
    if (event.target === event.currentTarget) requestClose();
  };

  return createPortal(
    <div className={styles.contributionEditorBackdrop} onMouseDown={handleBackdrop}>
      <div
        ref={dialogRef}
        className={styles.contributionEditorDialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby="contribution-editor-title"
        aria-hidden={confirmation ? "true" : undefined}
        tabIndex={-1}
      >
        <header className={styles.contributionEditorHeader}>
          <div>
            <span className={styles.contributionEditorEyebrow}>Поздравление для открытки</span>
            <h2 id="contribution-editor-title">{title}</h2>
          </div>
          <button type="button" className={styles.contributionEditorClose} onClick={requestClose} aria-label="Закрыть редактор">
            ×
          </button>
        </header>

        <form ref={formRef} className={styles.contributionEditorForm} onSubmit={submit} noValidate>
          <input type="hidden" name="manageToken" value={manageToken} />
          <input type="hidden" name="contributionId" value={contribution?.id ?? ""} />
          <input type="hidden" name="aiGenerationIds" value={aiGenerationIds.join(",")} />
          <input type="hidden" name="message" value={message} />
          <input type="hidden" name="status" value={isVisible ? "visible" : "hidden"} />
          <input type="hidden" name="isMainGreeting" value={isMain ? "true" : "false"} />

          <div className={styles.contributionEditorScroll}>
            <div className={styles.contributionEditorIdentity}>
              <label className={authorNameError ? styles.contributionEditorFieldInvalid : undefined}>
                <span>Имя автора</span>
                <input
                  name="authorName"
                  value={authorName}
                  onChange={(event) => { setAuthorName(event.target.value); markEdited("authorName"); }}
                  onBlur={() => markBlurredAfterEdit("authorName")}
                  aria-invalid={authorNameError}
                  aria-describedby={authorNameError ? "contribution-author-name-error" : undefined}
                  placeholder="Например, Мария"
                  minLength={2}
                  maxLength={80}
                  required
                />
                <span
                  id="contribution-author-name-error"
                  className={`${styles.contributionEditorFieldError} ${authorNameError ? "" : styles.contributionEditorFieldErrorReserved}`}
                  role={authorNameError ? "alert" : undefined}
                  aria-hidden={authorNameError ? undefined : true}
                >
                  {authorNameError ? "Укажите имя автора." : "\u00a0"}
                </span>
              </label>
              <label className={authorRoleError ? styles.contributionEditorFieldInvalid : undefined}>
                <span>Роль или подпись</span>
                <input
                  name="authorRole"
                  value={authorRole}
                  onChange={(event) => { setAuthorRole(event.target.value); markEdited("authorRole"); }}
                  onBlur={() => markBlurredAfterEdit("authorRole")}
                  aria-invalid={authorRoleError}
                  aria-describedby={authorRoleError ? "contribution-author-role-error" : undefined}
                  placeholder="Например, коллега"
                  required
                  maxLength={80}
                />
                <span
                  id="contribution-author-role-error"
                  className={`${styles.contributionEditorFieldError} ${authorRoleError ? "" : styles.contributionEditorFieldErrorReserved}`}
                  role={authorRoleError ? "alert" : undefined}
                  aria-hidden={authorRoleError ? undefined : true}
                >
                  {authorRoleError ? "Укажите роль или подпись." : "\u00a0"}
                </span>
              </label>
            </div>

            <div className={styles.contributionEditorMode} role="tablist" aria-label="Способ подготовки текста">
              <button
                type="button"
                role="tab"
                aria-selected={mode === "manual"}
                className={mode === "manual" ? styles.contributionEditorModeActive : ""}
                onClick={() => setMode("manual")}
              >
                Написать самому
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={mode === "ai"}
                className={mode === "ai" ? styles.contributionEditorModeActive : ""}
                onClick={() => setMode("ai")}
              >
                ✨ Помочь с текстом
              </button>
            </div>

            {mode === "manual" ? (
              <div className={`${styles.contributionEditorMessage} ${messageError ? styles.contributionEditorFieldInvalid : ""}`}>
                <span className={styles.contributionEditorLabelRow}>
                  <label htmlFor="contribution-editor-message">Текст поздравления</label>
                  <span className={styles.contributionEditorCounter}>
                    {message.length} / {CONTRIBUTION_MESSAGE_MAX_LENGTH}
                  </span>
                </span>
                <textarea
                  id="contribution-editor-message"
                  value={message}
                  onChange={(event) => { setMessage(event.target.value); markEdited("message"); }}
                  onBlur={() => markBlurredAfterEdit("message")}
                  aria-invalid={messageError}
                  aria-describedby={messageError ? "contribution-message-error" : undefined}
                  placeholder="Напишите тёплые слова…"
                  minLength={20}
                  maxLength={CONTRIBUTION_MESSAGE_MAX_LENGTH}
                  rows={8}
                  required
                />
                {messageError ? <span id="contribution-message-error" className={styles.contributionEditorFieldError} role="alert">Напишите текст поздравления.</span> : null}
                {hasAiReplacement && contribution ? (
                  <span className={styles.contributionEditorAiUndo} role="status">
                    <span>AI-вариант подставлен, но ещё не сохранён.</span>
                    <button
                      type="button"
                      onClick={() => {
                        setMessage(contribution.message);
                        setHasAiReplacement(false);
                        markEdited("message");
                      }}
                    >
                      Вернуть исходный текст
                    </button>
                  </span>
                ) : null}
                <span className={message.length > CONTRIBUTION_MESSAGE_RECOMMENDED_LENGTH ? styles.contributionEditorWarning : styles.contributionEditorHint}>
                  {message.length > CONTRIBUTION_MESSAGE_RECOMMENDED_LENGTH
                    ? "Поздравление можно сохранить, но для некоторых вариантов оформления его потребуется сократить."
                    : `Лучше всего смотрятся поздравления до ${CONTRIBUTION_MESSAGE_RECOMMENDED_LENGTH} символов.`}
                </span>
              </div>
            ) : (
              <div className={styles.contributionEditorAiMode}>
                <AiHelper
                  cardId={cardId}
                  manageToken={manageToken}
                  occasionText={occasionText}
                  messageLimit={CONTRIBUTION_MESSAGE_RECOMMENDED_LENGTH}
                  onUseText={(text, generationId) => {
                    setMessage(text);
                    setHasAiReplacement(Boolean(contribution));
                    markEdited("message");
                    setMode("manual");
                    setAiGenerationIds((currentIds) =>
                      currentIds.includes(generationId) ? currentIds : [...currentIds, generationId]
                    );
                  }}
                  onGeneration={(generationId) =>
                    setAiGenerationIds((currentIds) =>
                      currentIds.includes(generationId) ? currentIds : [...currentIds, generationId]
                    )
                  }
                  onDraftChange={setAiDraft}
                  variant="join"
                  greetingMode={greetingMode}
                  sourceContributionId={contribution?.id}
                  sourceText={contribution ? message : undefined}
                />
              </div>
            )}

            {contribution ? (
              <section className={styles.contributionEditorOptions} aria-label="Настройки поздравления">
                <button
                  type="button"
                  role="switch"
                  aria-checked={isVisible}
                  aria-disabled={isPending || isMainGreeting}
                  aria-describedby={isMainGreeting ? "main-greeting-lock-explanation" : undefined}
                  className={styles.contributionEditorOptionRow}
                  disabled={isPending || isMainGreeting}
                  onClick={() => setIsVisible((current) => !current)}
                >
                  <span><strong>Показывать в открытке</strong><small>{isVisible ? "Видно получателю" : "Скрыто из открытки"}</small></span>
                  <span className={styles.contributionEditorOptionState} aria-hidden="true">
                    {isMainGreeting ? <span className={styles.contributionEditorLockedState}><LockIcon />Заблокировано</span> : null}
                    <span className={styles.contributionEditorSwitch}><span /></span>
                  </span>
                </button>
                {isMainGreeting ? <p id="main-greeting-lock-explanation"><LockIcon />Сначала выберите другое главное поздравление.</p> : null}

                <button
                  type="button"
                  role="switch"
                  aria-checked={isMain}
                  aria-disabled={isPending || !isVisible || isMainGreeting}
                  aria-describedby={isMainGreeting ? "main-greeting-lock-explanation" : !isVisible ? "hidden-greeting-lock-explanation" : undefined}
                  className={styles.contributionEditorOptionRow}
                  disabled={isPending || !isVisible || isMainGreeting}
                  onClick={() => setIsMain((current) => !current)}
                >
                  <span><strong>Главное поздравление</strong><small>Отдельный акцентный блок</small></span>
                  <span className={styles.contributionEditorOptionState} aria-hidden="true">
                    {isMainGreeting || !isVisible ? <span className={styles.contributionEditorLockedState}><LockIcon />Заблокировано</span> : null}
                    <span className={styles.contributionEditorSwitch}><span /></span>
                  </span>
                </button>
                {!isVisible ? <p id="hidden-greeting-lock-explanation"><LockIcon />Сначала включите показ поздравления в открытке.</p> : null}
              </section>
            ) : null}
          </div>

          <footer className={styles.contributionEditorFooter}>
            <div className={styles.contributionEditorFooterSide}>
              {contribution ? (
                <button
                  type="button"
                  className={styles.contributionEditorDelete}
                  disabled={isPending || isMainGreeting}
                  onClick={() => setConfirmation("delete")}
                >
                  Удалить поздравление
                </button>
              ) : null}
            </div>
            <div className={styles.contributionEditorSubmitGroup}>
              {error ? <span className={styles.contributionEditorError} role="alert">{error}</span> : null}
              <button type="button" className={styles.contributionEditorCancel} onClick={requestClose} disabled={isPending}>
                Отмена
              </button>
              <button type="submit" className={styles.contributionEditorSubmit} disabled={isPending} data-inactive={!canSubmit || undefined} aria-busy={isPending}>
                {isPending ? "Сохраняем…" : contribution ? "Сохранить изменения" : "Добавить поздравление"}
              </button>
            </div>
          </footer>
        </form>
      </div>
      {confirmation === "close" ? (
        <ConfirmationDialog
          title="Изменения не сохранены"
          description="Закрыть редактор и потерять внесённые изменения?"
          onDismiss={() => setConfirmation(null)}
          actions={[
            ...(canSubmit ? [{ label: "Сохранить и выйти", onClick: saveFromConfirmation, disabled: isPending }] : []),
            { label: "Продолжить редактирование", tone: "secondary" as const, onClick: () => setConfirmation(null) },
            { label: "Выйти без сохранения", tone: "danger", onClick: onClose }
          ]}
        />
      ) : null}
      {confirmation === "delete" && contribution ? (
        <ConfirmationDialog
          title={`Удалить поздравление от «${contribution.authorName}»?`}
          description="Восстановить его будет невозможно."
          onDismiss={() => setConfirmation(null)}
          actions={[
            { label: "Отмена", tone: "secondary", onClick: () => setConfirmation(null) },
            { label: "Удалить поздравление", tone: "danger", disabled: isPending, onClick: removeContribution }
          ]}
        />
      ) : null}
    </div>,
    document.body
  );
};
