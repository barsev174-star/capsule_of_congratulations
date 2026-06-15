"use client";

import { useActionState } from "react";
import type { CardDraft } from "@/lib/cards/types";
import { updateCardBasicsAction } from "./actions";
import styles from "./manage-page.module.css";

type Props = {
  manageToken: string;
  card: CardDraft;
};

const initialState = {
  ok: false,
  message: ""
};

export const BasicsSettingsForm = ({ manageToken, card }: Props) => {
  const [state, formAction, isPending] = useActionState(updateCardBasicsAction, initialState);

  return (
    <form action={formAction} className={styles.basicsForm}>
      <input type="hidden" name="manageToken" value={manageToken} />
      <input type="hidden" name="occasion" value={card.occasion} />

      <div className={styles.fieldGrid}>
        <div className={styles.field}>
          <label htmlFor="recipientName">Имя получателя</label>
          <input
            id="recipientName"
            name="recipientName"
            defaultValue={card.recipientName}
            placeholder="Например, Анна Викторовна"
          />
        </div>
        <div className={styles.field}>
          <label htmlFor="fromLabel">От кого открытка</label>
          <input
            id="fromLabel"
            name="fromLabel"
            defaultValue={card.fromLabel}
            placeholder="Например, от 5Б класса"
          />
        </div>
      </div>

      <div className={styles.field}>
        <label htmlFor="occasionText">Повод или контекст</label>
        <input
          id="occasionText"
          name="occasionText"
          defaultValue={card.occasionText}
          placeholder="Например, благодарим за выпускной год в садике"
        />
      </div>

      <div className={styles.fieldGrid}>
        <div className={styles.field}>
          <label htmlFor="organizerName">Имя организатора</label>
          <input id="organizerName" name="organizerName" defaultValue={card.organizerName} placeholder="Ваше имя" />
        </div>
        <div className={styles.field}>
          <label htmlFor="organizerEmail">Email организатора</label>
          <input
            id="organizerEmail"
            name="organizerEmail"
            type="email"
            defaultValue={card.organizerEmail}
            placeholder="name@example.com"
          />
        </div>
      </div>

      <div className={styles.fieldGrid}>
        <div className={styles.field}>
          <label htmlFor="eventDate">Дата события</label>
          <input id="eventDate" name="eventDate" type="date" defaultValue={card.eventDate ?? ""} />
        </div>
        <div className={styles.field}>
          <label htmlFor="description">Короткое описание</label>
          <textarea
            id="description"
            name="description"
            defaultValue={card.description ?? ""}
            placeholder="Например, хотим собрать личную и красивую открытку от всей группы."
          />
        </div>
      </div>

      <div className={styles.editorFooter}>
        <button type="submit" className={styles.button} disabled={isPending}>
          {isPending ? "Сохраняем основу..." : "Сохранить основу открытки"}
        </button>
        {state.message ? (
          <span className={state.ok ? styles.editorSuccess : styles.editorError}>{state.message}</span>
        ) : null}
      </div>
    </form>
  );
};
