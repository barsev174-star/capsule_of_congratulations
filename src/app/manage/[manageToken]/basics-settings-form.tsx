"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { CardDraft } from "@/lib/cards/types";
import type { CardBasicsFormState } from "./actions";
import { resendOrganizerAccessAction, updateCardBasicsAction } from "./actions";
import { serializeBasicsFields } from "./basics-fields";
import styles from "./manage-page.module.css";

type Props = {
  manageToken: string;
  card: CardDraft;
};

const initialState: CardBasicsFormState = {
  ok: false,
  message: ""
};

const buildFields = (card: CardDraft) => ({
  recipientName: card.recipientName,
  fromLabel: card.fromLabel,
  occasionText: card.occasionText,
  organizerName: card.organizerName,
  organizerEmail: card.organizerEmail,
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

export const BasicsSettingsForm = ({ manageToken, card }: Props) => {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [state, setState] = useState<CardBasicsFormState>(initialState);
  const [accessMessage, setAccessMessage] = useState("");

  const [fields, setFields] = useState(() => buildFields(card));
  const requiredFieldsReady = areRequiredFieldsReady(fields);
  const [isMobileExpanded, setIsMobileExpanded] = useState(
    () => !areRequiredFieldsReady(buildFields(card))
  );

  const currentKey = serializeBasicsFields(fields);
  const savedFields = state.ok && state.fields ? state.fields : buildFields(card);
  const savedKey = serializeBasicsFields(savedFields);
  const submittedFields = !state.ok && state.fields ? state.fields : null;
  const submittedKey = submittedFields ? serializeBasicsFields(submittedFields) : null;
  const isDirty = currentKey !== savedKey;
  const justFailed = submittedKey !== null && submittedKey === currentKey;
  const showResendAction = Boolean(
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

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startTransition(async () => {
      const result = await updateCardBasicsAction(state, formData);
      setState(result);
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
      setAccessMessage(result.message);
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
          <strong>Контакт организатора</strong>
          <span>Нужен для восстановления доступа к открытке.</span>
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
            <label htmlFor="organizerEmail">Email <span className={styles.requiredMark} aria-hidden="true">*</span></label>
            <input
              id="organizerEmail"
              name="organizerEmail"
              type="email"
              value={fields.organizerEmail}
              onChange={handleChange("organizerEmail")}
              placeholder="name@example.com"
              maxLength={254}
              autoComplete="email"
              aria-describedby={`organizer-email-help${state.accessEmail?.status === "failed" ? " organizer-email-error" : ""}`}
              required
            />
          </div>
        </div>
        <div className={styles.organizerAccessActions} id="organizer-email-help">
          <span>Ссылка для входа придёт на этот email. Пароль и регистрация не нужны.</span>
          {showResendAction ? (
            <button
              type="button"
              className={styles.organizerAccessResend}
              disabled={isPending || !fields.organizerEmail.trim()}
              onClick={resendAccess}
            >
              Отправить ссылку ещё раз
            </button>
          ) : null}
        </div>
        {state.accessEmail ? (
          <p
            id={state.accessEmail.status === "failed" ? "organizer-email-error" : undefined}
            className={`${styles.organizerAccessFeedback} ${state.accessEmail.status === "failed" ? styles.organizerAccessFeedbackError : ""}`}
            aria-live="polite"
          >
            {state.accessEmail.message}
            {state.accessEmail.status === "failed" ? (
              <button type="button" onClick={resendAccess} disabled={isPending}>
                Отправить ещё раз
              </button>
            ) : null}
          </p>
        ) : null}
        {accessMessage ? <p className={styles.organizerAccessFeedback} aria-live="polite">{accessMessage}</p> : null}
      </section>

      <details className={styles.basicsAdditional}>
        <summary>Дополнительные настройки</summary>
        <div className={styles.basicsAdditionalContent}>
      <div className={styles.fieldGrid}>
        <div className={styles.field}>
          <label htmlFor="eventDate">Дата события</label>
          <input
            id="eventDate"
            name="eventDate"
            type="date"
            value={fields.eventDate}
            onChange={handleChange("eventDate")}
          />
        </div>
        <div className={styles.field}>
          <label htmlFor="signature">Подпись в конце открытки</label>
          <input
            id="signature"
            name="signature"
            value={fields.signature}
            onChange={handleChange("signature")}
            placeholder="Например, С любовью, команда Product & Design"
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
  );
};
