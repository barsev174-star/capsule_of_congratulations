"use client";

import { useState, useTransition } from "react";
import type { CardDraft } from "@/lib/cards/types";
import type { CardBasicsFormState } from "./actions";
import { updateCardBasicsAction } from "./actions";
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

const serializeFields = (fields: ReturnType<typeof buildFields>) => JSON.stringify(fields);

export const BasicsSettingsForm = ({ manageToken, card }: Props) => {
  const [isPending, startTransition] = useTransition();
  const [state, setState] = useState<CardBasicsFormState>(initialState);

  const [fields, setFields] = useState(() => buildFields(card));

  const currentKey = serializeFields(fields);
  const savedFields = state.ok && state.fields ? state.fields : buildFields(card);
  const savedKey = serializeFields(savedFields);
  const submittedFields = !state.ok && state.fields ? state.fields : null;
  const submittedKey = submittedFields ? serializeFields(submittedFields) : null;
  const isDirty = currentKey !== savedKey;
  const justFailed = submittedKey !== null && submittedKey === currentKey;

  const handleChange = (key: keyof typeof fields) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFields((prev) => ({ ...prev, [key]: e.target.value }));
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startTransition(async () => {
      const result = await updateCardBasicsAction(state, formData);
      setState(result);
    });
  };

  return (
    <form onSubmit={handleSubmit} className={styles.basicsForm}>
      <input type="hidden" name="manageToken" value={manageToken} />
      <input type="hidden" name="occasion" value={card.occasion} />

      <div className={styles.fieldGrid}>
        <div className={styles.field}>
          <label htmlFor="recipientName">Имя получателя</label>
          <input
            id="recipientName"
            name="recipientName"
            value={fields.recipientName}
            onChange={handleChange("recipientName")}
            placeholder="Например, Анна Викторовна"
            minLength={2}
            maxLength={80}
          />
        </div>
        <div className={styles.field}>
          <label htmlFor="fromLabel">От кого открытка</label>
          <input
            id="fromLabel"
            name="fromLabel"
            value={fields.fromLabel}
            onChange={handleChange("fromLabel")}
            placeholder="Например, от коллег, от семьи, от друзей"
            minLength={2}
            maxLength={80}
          />
        </div>
      </div>

      <div className={styles.field}>
        <label htmlFor="occasionText">Надпись события</label>
        <span className={styles.fieldHint}>Короткая надпись, которая появится на обложке открытки.</span>
        <input
          id="occasionText"
          name="occasionText"
          value={fields.occasionText}
          onChange={handleChange("occasionText")}
          placeholder="С днём рождения!"
          minLength={2}
          maxLength={40}
        />
      </div>

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
        <textarea
          id="description"
          name="description"
          value={fields.description}
          onChange={handleChange("description")}
          placeholder="Например, хотим собрать личную и красивую открытку от всей группы."
        />
      </div>

      <section className={styles.organizerAccessBlock}>
        <div className={styles.organizerAccessIntro}>
          <strong>Доступ организатора</strong>
          <span>На этот email придёт одноразовая ссылка для входа в раздел «Мои открытки».</span>
        </div>
        <div className={styles.fieldGrid}>
          <div className={styles.field}>
            <label htmlFor="organizerName">Имя организатора</label>
            <input
              id="organizerName"
              name="organizerName"
              value={fields.organizerName}
              onChange={handleChange("organizerName")}
              placeholder="Например, Мария"
              minLength={2}
              maxLength={80}
              autoComplete="name"
            />
          </div>
          <div className={styles.field}>
            <label htmlFor="organizerEmail">Email организатора</label>
            <input
              id="organizerEmail"
              name="organizerEmail"
              type="email"
              value={fields.organizerEmail}
              onChange={handleChange("organizerEmail")}
              placeholder="name@example.com"
              maxLength={254}
              autoComplete="email"
            />
          </div>
        </div>
      </section>

      <div className={styles.basicsSaveRow}>
        <div className={styles.autoSaveStatus} aria-live="polite">
          {isPending
            ? "Сохраняем…"
            : justFailed
              ? state.message
              : isDirty
                ? "Есть несохранённые изменения"
                : state.ok
                  ? "Изменения сохранены"
                  : null}
        </div>
        <button
          type="submit"
          className={styles.contentPrimaryButton}
          disabled={isPending || !isDirty}
        >
          {isPending ? "Сохраняем…" : "Сохранить изменения"}
        </button>
      </div>
    </form>
  );
};
