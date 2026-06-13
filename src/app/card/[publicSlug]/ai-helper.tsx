"use client";

import { useState, useTransition } from "react";
import styles from "./participant-page.module.css";

type AiVariant = {
  id: string;
  label: string;
  text: string;
};

type Props = {
  cardId: string;
  recipientName: string;
  occasion: string;
  occasionText: string;
  onUseText: (text: string) => void;
};

export const AiHelper = ({ cardId, recipientName, occasion, occasionText, onUseText }: Props) => {
  const [issues, setIssues] = useState<string[]>([]);
  const [variants, setVariants] = useState<AiVariant[]>([]);
  const [remaining, setRemaining] = useState<number | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleGenerate = async (formData: FormData) => {
    setIssues([]);
    setVariants([]);

    const response = await fetch("/api/ai/participant-message", {
      method: "POST",
      body: formData
    });

    const payload = await response.json();

    if (!response.ok) {
      if (payload.issues) {
        setIssues(payload.issues.map((issue: { message: string }) => issue.message));
      } else if (payload.message) {
        setIssues([payload.message]);
      } else {
        setIssues(["Не удалось получить варианты текста."]);
      }

      return;
    }

    setVariants(payload.result.variants);
    setRemaining(payload.result.remainingCardGenerations);
  };

  return (
    <section className={styles.aiCard}>
      <h2 className={styles.sectionTitle}>Помочь с текстом через AI</h2>
      <p className={styles.hint}>
        Напишите мысли своими словами, даже в сыром виде. AI аккуратно соберет их в 3 черновика поздравления, и вы
        выберете лучший.
      </p>

      <form
        className={styles.form}
        action={(formData) => {
          formData.set("cardId", cardId);
          formData.set("recipientName", recipientName);
          formData.set("occasion", occasion);
          formData.set("occasionText", occasionText);

          startTransition(async () => {
            await handleGenerate(formData);
          });
        }}
      >
        <input type="hidden" name="cardId" value={cardId} />
        <input type="hidden" name="recipientName" value={recipientName} />
        <input type="hidden" name="occasion" value={occasion} />
        <input type="hidden" name="occasionText" value={occasionText} />

        {issues.length > 0 ? (
          <div className={styles.errorBox} aria-live="polite">
            <strong>Чтобы AI помог точнее, нужно поправить:</strong>
            <ul className={styles.errorList}>
              {issues.map((issue) => (
                <li key={issue}>{issue}</li>
              ))}
            </ul>
          </div>
        ) : null}

        <div className={styles.field}>
          <label htmlFor="draftNotes">Что хотите сказать своими словами</label>
          <textarea
            id="draftNotes"
            name="draftNotes"
            placeholder="Например: Хочу пожелать любви, радости. Ценю скромность, целеустремленность, рад с тобой работать. Оставайся такой же веселой."
            required
          />
          <span className={styles.hint}>
            Можно писать неровно и по пунктам. AI опирается на контекст открытки: <strong>{occasionText}</strong>.
          </span>
        </div>

        <div className={styles.field}>
          <label htmlFor="style">Стиль поздравления</label>
          <select id="style" name="style" defaultValue="touching">
            <option value="warm-simple">Тепло и просто</option>
            <option value="short-no-pathos">Коротко без пафоса</option>
            <option value="humor">С легким юмором</option>
            <option value="touching">Трогательно</option>
            <option value="respectful">Уважительно</option>
          </select>
        </div>

        <div className={styles.actions}>
          <button type="submit" className={styles.submitButton} disabled={isPending}>
            {isPending ? "Готовим варианты..." : "Получить 3 варианта"}
          </button>
          {remaining !== null ? <span className={styles.note}>Осталось AI-генераций для открытки: {remaining}</span> : null}
        </div>
      </form>

      {variants.length > 0 ? (
        <div className={styles.variants}>
          {variants.map((variant) => (
            <article key={variant.id} className={styles.variantCard}>
              <h3 className={styles.variantTitle}>{variant.label}</h3>
              <p className={styles.message}>{variant.text}</p>
              <button type="button" className={styles.useButton} onClick={() => onUseText(variant.text)}>
                Использовать этот текст
              </button>
            </article>
          ))}
        </div>
      ) : null}
    </section>
  );
};
