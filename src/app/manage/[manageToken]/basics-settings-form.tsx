"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { CardDraft } from "@/lib/cards/types";
import type { CardBasicsFormState } from "./actions";
import {
  cancelOrganizerEmailChangeAction,
  requestOrganizerEmailChangeAction,
  resendOrganizerAccessAction,
  revokeRecoveryLinksAction,
  rotateRecoveryLinkAction,
  updateCardBasicsAction
} from "./actions";
import type { PendingOrganizerEmailChange } from "@/lib/organizer/repository";
import { serializeBasicsFields } from "./basics-fields";
import { ConfirmationDialog } from "./confirmation-dialog";
import { CopyLinkButton } from "./copy-link-button";
import styles from "./manage-page.module.css";
import accessStyles from "./organizer-access-settings.module.css";
import { OrganizerEmailChangeDialog } from "./organizer-email-change-dialog";
import { requestCardAccessAction } from "./access-actions";

type Props = {
  manageToken: string;
  card: CardDraft;
  canManageAccess?: boolean;
  initialPendingEmailChange?: PendingOrganizerEmailChange | null;
  initialRecoveryLinkActive?: boolean;
  isGuestDraft?: boolean;
  initialPendingEmailClaim?: PendingOrganizerEmailChange | null;
};

const initialState: CardBasicsFormState = {
  ok: false,
  message: ""
};

const buildFields = (card: CardDraft, pendingEmail = "") => ({
  recipientName: card.recipientName,
  fromLabel: card.fromLabel,
  occasionText: card.occasionText,
  organizerName: card.organizerName,
  organizerEmail: card.organizerEmail || pendingEmail,
  eventDate: card.eventDate ?? "",
  description: card.description ?? "",
  signature: card.signature ?? ""
});

const areRequiredFieldsReady = (fields: ReturnType<typeof buildFields>) =>
  Boolean(
    fields.recipientName.trim() &&
      fields.fromLabel.trim() &&
      fields.occasionText.trim() &&
      fields.organizerName.trim() &&
      fields.organizerEmail.trim()
  );

const ACCESS_COOLDOWN_SECONDS = 60;

const maskEmail = (email: string) => {
  const [localPart, domain] = email.split("@");
  if (!localPart || !domain) return email;
  return `${localPart.slice(0, 1)}${"*".repeat(Math.min(3, Math.max(1, localPart.length - 1)))}@${domain}`;
};

const useCooldown = (initialStartedAt?: string | null) => {
  const [remaining, setRemaining] = useState(0);

  useEffect(() => {
    if (!initialStartedAt) return;
    const timeout = window.setTimeout(() => {
      const elapsedSeconds = Math.floor((Date.now() - Date.parse(initialStartedAt)) / 1000);
      setRemaining(Math.max(0, ACCESS_COOLDOWN_SECONDS - elapsedSeconds));
    }, 0);
    return () => window.clearTimeout(timeout);
  }, [initialStartedAt]);

  useEffect(() => {
    if (remaining <= 0) return;
    const timeout = window.setTimeout(() => setRemaining((value) => Math.max(0, value - 1)), 1000);
    return () => window.clearTimeout(timeout);
  }, [remaining]);

  return [remaining, () => setRemaining(ACCESS_COOLDOWN_SECONDS)] as const;
};

export const BasicsSettingsForm = ({
  manageToken,
  card,
  canManageAccess = true,
  initialPendingEmailChange = null,
  initialRecoveryLinkActive = true,
  isGuestDraft = false,
  initialPendingEmailClaim = null
}: Props) => {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [state, setState] = useState<CardBasicsFormState>(initialState);
  const [accessMessage, setAccessMessage] = useState("");
  const [newOrganizerEmail, setNewOrganizerEmail] = useState("");
  const [emailChangeMessage, setEmailChangeMessage] = useState("");
  const [emailChangeStatus, setEmailChangeStatus] = useState("");
  const [pendingEmailChange, setPendingEmailChange] = useState(initialPendingEmailChange);
  const [pendingEmailChangeDevUrl, setPendingEmailChangeDevUrl] = useState("");
  const [isEmailChangeOpen, setIsEmailChangeOpen] = useState(false);
  const [recoveryMessage, setRecoveryMessage] = useState("");
  const [recoveryUrl, setRecoveryUrl] = useState("");
  const [recoveryLinkActive, setRecoveryLinkActive] = useState(initialRecoveryLinkActive);
  const [recoveryConfirmation, setRecoveryConfirmation] = useState<"rotate" | "revoke" | null>(null);
  const [accessCooldown, startAccessCooldown] = useCooldown(initialPendingEmailClaim?.createdAt);
  const [emailChangeCooldown, startEmailChangeCooldown] = useCooldown(initialPendingEmailChange?.createdAt);

  const [fields, setFields] = useState(() => buildFields(card, initialPendingEmailClaim?.email));
  const requiredFieldsReady = areRequiredFieldsReady(fields);
  const [isMobileExpanded, setIsMobileExpanded] = useState(
    () => isGuestDraft || !areRequiredFieldsReady(buildFields(card))
  );

  const currentKey = serializeBasicsFields(fields);
  const savedFields = state.ok && state.fields ? state.fields : buildFields(card, initialPendingEmailClaim?.email);
  const savedKey = serializeBasicsFields(savedFields);
  const submittedFields = !state.ok && state.fields ? state.fields : null;
  const submittedKey = submittedFields ? serializeBasicsFields(submittedFields) : null;
  const isDirty = currentKey !== savedKey;
  const justFailed = submittedKey !== null && submittedKey === currentKey;
  const showResendAction = canManageAccess && !isGuestDraft && Boolean(
    card.organizerEmail.trim() ||
      state.accessEmail ||
      accessMessage
  );

  useEffect(() => {
    window.dispatchEvent(
      new CustomEvent("manage:basics-dirty", { detail: { isDirty, isPending } })
    );
  }, [isDirty, isPending]);

  useEffect(() => {
    const expandForHash = () => {
      if (window.location.hash === "#basics-section") setIsMobileExpanded(true);
    };
    const frame = window.requestAnimationFrame(expandForHash);
    window.addEventListener("hashchange", expandForHash);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("hashchange", expandForHash);
    };
  }, []);

  const handleChange = (key: keyof typeof fields) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const nextFields = { ...fields, [key]: e.target.value };
    setFields(nextFields);
    if (!areRequiredFieldsReady(nextFields)) setIsMobileExpanded(true);
  };

  const handleEventDateChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const form = event.currentTarget.form;
    handleChange("eventDate")(event);
    form?.requestSubmit();
  };

  const handleAutoSaveBlur = (event: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    event.currentTarget.form?.requestSubmit();
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startTransition(async () => {
      const result = await updateCardBasicsAction(state, formData);
      setState(result);
      if (result.accessEmail?.status === "sent") startAccessCooldown();
      if (!result.ok) setIsMobileExpanded(true);
      if (result.ok && result.fields) {
        setFields(result.fields);
        router.refresh();
      }
    });
  };

  const resendAccess = () => {
    setAccessMessage("");
    startTransition(async () => {
      const result = await resendOrganizerAccessAction(manageToken);
      setAccessMessage(
        result.ok
          ? `✓ Ссылка отправлена на ${maskEmail(fields.organizerEmail)}.`
          : result.message
      );
      if (result.ok) startAccessCooldown();
    });
  };

  const confirmDraftEmail = () => {
    const data = new FormData();
    data.set("cardId", card.id);
    data.set("email", fields.organizerEmail);
    startTransition(async () => {
      const result = await requestCardAccessAction({ ok: false, message: "" }, data);
      setState((current) => ({ ...current, accessEmail: {
        status: result.ok ? "sent" : "failed", message: result.message, devAccessUrl: result.devAccessUrl
      } }));
      if (result.ok) startAccessCooldown();
    });
  };

  const requestEmailChange = (email: string, source: "dialog" | "pending") => {
    setEmailChangeMessage("");
    setEmailChangeStatus("");
    startTransition(async () => {
      const result = await requestOrganizerEmailChangeAction(manageToken, email);
      if ("pendingEmailChange" in result) {
        setPendingEmailChange(result.pendingEmailChange ?? null);
      }
      if (!result.ok) {
        if (source === "dialog") setEmailChangeMessage(result.message);
        else setEmailChangeStatus(result.message);
        return;
      }
      setPendingEmailChangeDevUrl(result.devAccessUrl ?? "");
      setEmailChangeStatus(`✓ Подтверждение отправлено на ${maskEmail(result.pendingEmailChange?.email ?? email)}.`);
      setIsEmailChangeOpen(false);
      startEmailChangeCooldown();
    });
  };

  const cancelEmailChange = () => {
    setEmailChangeStatus("");
    startTransition(async () => {
      const result = await cancelOrganizerEmailChangeAction(manageToken);
      setEmailChangeStatus(result.message);
      if (result.ok) {
        setPendingEmailChange(null);
        setPendingEmailChangeDevUrl("");
      }
    });
  };

  const rotateRecoveryLink = () => {
    setRecoveryConfirmation(null);
    setRecoveryMessage("");
    setRecoveryUrl("");
    startTransition(async () => {
      const result = await rotateRecoveryLinkAction(manageToken);
      setRecoveryMessage(result.recoveryUrl ? "" : result.message);
      setRecoveryUrl(result.recoveryUrl ?? "");
      if (result.ok) setRecoveryLinkActive(true);
    });
  };

  const revokeRecoveryLinks = () => {
    setRecoveryConfirmation(null);
    setRecoveryMessage("");
    setRecoveryUrl("");
    startTransition(async () => {
      const result = await revokeRecoveryLinksAction(manageToken);
      setRecoveryMessage(result.message);
      if (result.ok) setRecoveryLinkActive(false);
    });
  };
  const additionalFieldsCount = [
    fields.eventDate,
    fields.signature,
    fields.description
  ].filter((value) => value.trim()).length;
  const additionalStatus =
    additionalFieldsCount === 0
      ? "не заполнены"
      : additionalFieldsCount === 3
        ? "заполнены"
        : "заполнены частично";

  return (
    <>
    <form id="manage-basics-form" onSubmit={handleSubmit} className={styles.basicsForm}>
      <input type="hidden" name="manageToken" value={manageToken} />
      <input type="hidden" name="occasion" value={card.occasion} />

      <div className={styles.basicsMobileSummary}>
        <div
          className={styles.basicsMobileSummaryHeading}
          data-ready={requiredFieldsReady && !isDirty ? "true" : "false"}
        >
          <span>1</span>
          <strong>Основа открытки</strong>
          <em>{requiredFieldsReady && !isDirty ? "Готово" : "Нужно заполнить"}</em>
        </div>
        <div
          className={styles.basicsMobileSummaryDetails}
          data-expanded={isMobileExpanded ? "true" : "false"}
        >
          <strong>{fields.recipientName.trim() || "Получатель не указан"}</strong>
          <span>
            {fields.fromLabel.trim() || "Не указано, от кого"} ·{" "}
            {fields.occasionText.trim() || "Повод не указан"}
          </span>
          <small>
            {fields.organizerName.trim() && fields.organizerEmail.trim()
              ? "Контакт организатора указан"
              : "Контакт организатора не заполнен"}
          </small>
          <small>Дополнительные настройки: {additionalStatus}</small>
        </div>
        <button
          type="button"
          aria-expanded={isMobileExpanded}
          aria-controls="manage-basics-fields"
          onClick={() => setIsMobileExpanded((value) => !value)}
        >
          {isMobileExpanded ? "Свернуть" : "Изменить"}
        </button>
      </div>

      <div
        id="manage-basics-fields"
        className={`${styles.basicsFormContent} ${
          isMobileExpanded ? styles.basicsFormContentExpanded : ""
        }`}
      >
      <div className={styles.fieldGrid}>
        <div className={styles.field}>
          <label htmlFor="recipientName">Имя получателя <span className={styles.requiredMark} aria-hidden="true">*</span></label>
          <input
            id="recipientName"
            name="recipientName"
            value={fields.recipientName}
            onChange={handleChange("recipientName")}
            placeholder="Например, Анна Викторовна"
            minLength={2}
            maxLength={80}
            required
          />
        </div>
        <div className={styles.field}>
          <label htmlFor="fromLabel">От кого открытка <span className={styles.requiredMark} aria-hidden="true">*</span></label>
          <input
            id="fromLabel"
            name="fromLabel"
            value={fields.fromLabel}
            onChange={handleChange("fromLabel")}
            placeholder="Например, от коллег, от семьи, от друзей"
            minLength={2}
            maxLength={80}
            required
          />
        </div>
      </div>

      <div className={styles.field}>
        <label htmlFor="occasionText">Надпись события <span className={styles.requiredMark} aria-hidden="true">*</span></label>
        <span className={styles.fieldHint}>Короткая надпись, которая появится на обложке открытки.</span>
        <input
          id="occasionText"
          name="occasionText"
          value={fields.occasionText}
          onChange={handleChange("occasionText")}
          placeholder="С днём рождения!"
          minLength={2}
          maxLength={40}
          required
        />
      </div>

      <section className={styles.organizerAccessBlock}>
        <div className={styles.organizerAccessIntro}>
          <strong>Организатор</strong>
        </div>
        <div className={styles.fieldGrid}>
          <div className={styles.field}>
            <label htmlFor="organizerName">Ваше имя <span className={styles.requiredMark} aria-hidden="true">*</span></label>
            <input
              id="organizerName"
              name="organizerName"
              value={fields.organizerName}
              onChange={handleChange("organizerName")}
              placeholder="Например, Мария"
              minLength={2}
              maxLength={80}
              autoComplete="name"
              required
            />
          </div>
          <div className={styles.field}>
            {isGuestDraft ? <>
              <label htmlFor="draft-organizer-email">Ваш email <span className={styles.requiredMark} aria-hidden="true">*</span></label>
              <input id="draft-organizer-email" type="email" name="organizerEmail" autoComplete="email" required maxLength={254}
                value={fields.organizerEmail} onChange={handleChange("organizerEmail")} aria-describedby="organizer-email-help" />
            </> : <>
            <span id="organizer-email-label">Email владельца <span className={styles.requiredMark} aria-hidden="true">*</span></span>
            <input type="hidden" name="organizerEmail" value={fields.organizerEmail} />
            <div
              className={accessStyles.emailValue}
              role="group"
              aria-labelledby="organizer-email-label"
              aria-describedby={`organizer-email-help${state.accessEmail?.status === "failed" ? " organizer-email-error" : ""}`}
            >
              <strong>{fields.organizerEmail || "Не указан"}</strong>
              <small>{card.organizerEmail.trim()
                ? "Подтверждённый адрес — изменить его можно в настройках доступа"
                : "Владелец ещё не назначен"}</small>
            </div>
            </>}
          </div>
        </div>
        <div className={styles.organizerAccessActions} id="organizer-email-help">
          <span>{isGuestDraft
            ? "Пока черновик доступен только в этом браузере, до 7 дней. При сохранении отправим ссылку на email — подтвердите его, чтобы вернуться с любого устройства и пригласить участников."
            : card.organizerEmail.trim()
              ? "На этот email приходят ссылки для входа. Пароль не нужен."
              : "Служебный доступ позволяет редактировать открытку. Для подтверждения email откройте черновик в браузере, где он был создан."}</span>
        </div>
        {isGuestDraft && initialPendingEmailClaim && !state.accessEmail ? (
          <p className={styles.organizerAccessFeedback}>
            Письмо отправлено на {initialPendingEmailClaim.email}. Перейдите по ссылке в письме, чтобы подтвердить email.
          </p>
        ) : null}
        {isGuestDraft && (initialPendingEmailClaim || state.accessEmail) ? <div className={styles.organizerAccessActions}>
          <button type="button" className={styles.statusSecondaryAction} onClick={confirmDraftEmail}
            disabled={isPending || accessCooldown > 0 || !fields.organizerEmail.trim()}>
            {accessCooldown > 0 ? `Повторить через ${accessCooldown} с` : "Отправить подтверждение ещё раз"}
          </button>
          <button type="button" className={styles.statusSecondaryAction} onClick={() => router.refresh()}>Я подтвердил email</button>
        </div> : null}
        {canManageAccess && !isGuestDraft ? (
          <details className={styles.organizerSecurityDetails}>
            <summary>
              <span>Доступ и безопасность</span>
              <small>Вход, email владельца и резервная ссылка</small>
            </summary>
            <div className={styles.organizerSecurityContent}>
              <section className={styles.organizerSecuritySection}>
                <div>
                  <strong>Вход по email</strong>
                  <span>Отправьте новую ссылку, если нужно войти на другом устройстве.</span>
                </div>
                {showResendAction ? (
                  <button
                    type="button"
                    className={`${styles.organizerAccessResend} ${accessStyles.cooldownButton}`}
                    disabled={isPending || accessCooldown > 0 || !fields.organizerEmail.trim()}
                    onClick={resendAccess}
                  >
                    {accessCooldown > 0
                      ? `Отправить ещё раз через ${accessCooldown} с`
                      : accessMessage
                        ? "Отправить ещё раз"
                        : "Отправить ссылку для входа"}
                  </button>
                ) : null}
                {accessMessage ? <p className={styles.organizerAccessFeedback} aria-live="polite">{accessMessage}</p> : null}
              </section>

              <section className={styles.organizerEmailChange}>
                <div>
                  <strong>Email владельца</strong>
                  <span>Новый адрес станет владельцем только после подтверждения из письма.</span>
                </div>
                {pendingEmailChange ? (
                  <div className={accessStyles.pendingEmailPanel}>
                    <span>Ожидает подтверждения</span>
                    <strong>{pendingEmailChange.email}</strong>
                    <small>Мы отправили письмо на новый адрес. До подтверждения владельцем остаётся {fields.organizerEmail}.</small>
                    <div className={accessStyles.pendingEmailActions}>
                      <button
                        type="button"
                        onClick={() => requestEmailChange(pendingEmailChange.email, "pending")}
                        disabled={isPending || emailChangeCooldown > 0}
                      >
                        {emailChangeCooldown > 0
                          ? `Отправить ещё раз через ${emailChangeCooldown} с`
                          : "Отправить ещё раз"}
                      </button>
                      <button type="button" onClick={cancelEmailChange} disabled={isPending}>
                        Отменить смену
                      </button>
                    </div>
                    {pendingEmailChangeDevUrl ? <a href={pendingEmailChangeDevUrl}>Открыть тестовую ссылку</a> : null}
                  </div>
                ) : (
                  <button
                    type="button"
                    className={accessStyles.launchButton}
                    onClick={() => {
                      setEmailChangeMessage("");
                      setNewOrganizerEmail("");
                      setIsEmailChangeOpen(true);
                    }}
                    disabled={isPending}
                  >
                    Изменить email
                  </button>
                )}
                {emailChangeStatus ? <p className={accessStyles.inlineStatus} aria-live="polite">{emailChangeStatus}</p> : null}
              </section>

              <section className={styles.organizerRecoverySettings}>
                <div>
                  <strong>Резервная ссылка</strong>
                  <span>
                    {recoveryLinkActive
                      ? "Действующая ссылка помогает снова найти открытку и запросить вход на email владельца. Сама ссылка не открывает управление."
                      : "Резервная ссылка не создана. При необходимости создайте её для возврата к этой открытке и подтверждения входа."}
                  </span>
                </div>
                <div className={styles.organizerRecoveryActions}>
                  <button
                    type="button"
                    className={accessStyles.recoveryPrimary}
                    onClick={() => setRecoveryConfirmation("rotate")}
                    disabled={isPending}
                  >
                    {recoveryLinkActive ? "Создать новую резервную ссылку" : "Создать резервную ссылку"}
                  </button>
                  {recoveryLinkActive ? (
                    <button
                      type="button"
                      className={accessStyles.recoveryDanger}
                      onClick={() => setRecoveryConfirmation("revoke")}
                      disabled={isPending}
                    >
                      Отозвать все резервные ссылки
                    </button>
                  ) : null}
                </div>
                {recoveryLinkActive ? <small>При создании новой ссылки все предыдущие сразу перестанут работать.</small> : null}
                {recoveryMessage ? <p aria-live="polite">{recoveryMessage}</p> : null}
                {recoveryUrl ? (
                  <div className={accessStyles.recoveryResult} role="status" aria-live="polite">
                    <strong>Резервная ссылка создана</strong>
                    <span>Сохраните её в надёжном месте. После ухода со страницы секрет повторно показать нельзя.</span>
                    <input
                      aria-label="Новая резервная ссылка"
                      readOnly
                      value={recoveryUrl}
                      onFocus={(event) => event.currentTarget.select()}
                    />
                    <CopyLinkButton
                      value={recoveryUrl}
                      label="Скопировать ссылку"
                      copiedLabel="Ссылка скопирована"
                      className={accessStyles.copyRecoveryButton}
                    />
                  </div>
                ) : null}
              </section>
            </div>
          </details>
        ) : null}
        {state.accessEmail ? (
          <p
            id={state.accessEmail.status === "failed" ? "organizer-email-error" : undefined}
            className={`${styles.organizerAccessFeedback} ${state.accessEmail.status === "failed" ? styles.organizerAccessFeedbackError : ""}`}
            aria-live="polite"
          >
            {state.accessEmail.message}
            {state.accessEmail.status === "failed" ? (
              <button type="button" onClick={isGuestDraft ? confirmDraftEmail : resendAccess} disabled={isPending || accessCooldown > 0}>
                Отправить ещё раз
              </button>
            ) : null}
          </p>
        ) : null}
        {isGuestDraft && state.accessEmail?.devAccessUrl ? <a href={state.accessEmail.devAccessUrl}>Открыть тестовую ссылку подтверждения</a> : null}
      </section>

      <details className={styles.basicsAdditional}>
        <summary>Дополнительные настройки</summary>
        <div className={styles.basicsAdditionalContent}>
      <div className={styles.fieldGrid}>
        <div className={styles.field}>
          <label htmlFor="eventDate">Дата события</label>
          <span className={styles.fieldHint} id="event-date-hint">Сохраняется автоматически после выбора.</span>
          <input
            id="eventDate"
            name="eventDate"
            type="date"
            value={fields.eventDate}
            onChange={handleEventDateChange}
            aria-describedby="event-date-hint"
          />
        </div>
        <div className={styles.field}>
          <label htmlFor="signature">Подпись в конце открытки</label>
          <span className={styles.fieldHint} id="signature-hint">Сохраняется автоматически после выхода из поля.</span>
          <input
            id="signature"
            name="signature"
            value={fields.signature}
            onChange={handleChange("signature")}
            onBlur={handleAutoSaveBlur}
            aria-describedby="signature-hint"
            placeholder="Например, С любовью, команда Product & Design"
            minLength={2}
            maxLength={120}
          />
        </div>
      </div>

      <div className={styles.field}>
        <label htmlFor="description">Короткое описание</label>
        <span className={styles.fieldHint}>Используется в оформлении и пояснениях открытки, если это поддерживает выбранный шаблон.</span>
        <textarea
          id="description"
          name="description"
          value={fields.description}
          onChange={handleChange("description")}
          placeholder="Например, хотим собрать личную и красивую открытку от всей группы."
        />
      </div>
        </div>
      </details>

      <div className={styles.basicsInlineStatus} aria-live="polite">
        {isPending
          ? "Сохраняем…"
          : justFailed
            ? state.message
            : state.ok && !isDirty
              ? state.message
              : null}
      </div>
      </div>
    </form>
    {isEmailChangeOpen ? (
      <OrganizerEmailChangeDialog
        currentEmail={fields.organizerEmail}
        email={newOrganizerEmail}
        message={emailChangeMessage}
        isPending={isPending}
        onEmailChange={(email) => {
          setNewOrganizerEmail(email);
          setEmailChangeMessage("");
        }}
        onSubmit={() => requestEmailChange(newOrganizerEmail, "dialog")}
        onDismiss={() => setIsEmailChangeOpen(false)}
      />
    ) : null}
    {recoveryConfirmation === "rotate" ? (
      <ConfirmationDialog
        title={recoveryLinkActive ? "Создать новую резервную ссылку?" : "Создать резервную ссылку?"}
        description={
          recoveryLinkActive
            ? "Все предыдущие резервные ссылки сразу перестанут работать. Постоянный адрес открытки и вход по email владельца не изменятся."
            : "Ссылка поможет снова найти открытку и запросить вход на email владельца. Сама ссылка не открывает управление."
        }
        onDismiss={() => setRecoveryConfirmation(null)}
        actions={[
          { label: "Отмена", tone: "secondary", onClick: () => setRecoveryConfirmation(null) },
          { label: "Создать ссылку", onClick: rotateRecoveryLink, disabled: isPending }
        ]}
      />
    ) : null}
    {recoveryConfirmation === "revoke" ? (
      <ConfirmationDialog
        title="Отозвать все резервные ссылки?"
        description="Все резервные ссылки перестанут работать. Открытка останется доступна по постоянному адресу, а вход по email владельца сохранится."
        onDismiss={() => setRecoveryConfirmation(null)}
        actions={[
          { label: "Отмена", tone: "secondary", onClick: () => setRecoveryConfirmation(null) },
          { label: "Отозвать ссылки", tone: "danger", onClick: revokeRecoveryLinks, disabled: isPending }
        ]}
      />
    ) : null}
    </>
  );
};
