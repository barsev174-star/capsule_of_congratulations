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
  onUseText: (text: string) => void;
};

const qualityOptions = ["добрый", "внимательный", "надежный", "мудрый", "заботливый", "вдохновляющий"];
const wishOptions = ["здоровья", "радости", "спокойствия", "успехов", "тепла", "новых возможностей"];

export const AiHelper = ({ cardId, recipientName, occasion, onUseText }: Props) => {
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
        Ответьте на несколько коротких вопросов, и мы предложим 3 черновика поздравления. Потом можно
        выбрать лучший и отредактировать его вручную.
      </p>

      <form
        className={styles.form}
        action={(formData) => {
          formData.set("cardId", cardId);
          formData.set("recipientName", recipientName);
          formData.set("occasion", occasion);

          startTransition(async () => {
            await handleGenerate(formData);
          });
        }}
      >
        <input type="hidden" name="cardId" value={cardId} />
        <input type="hidden" name="recipientName" value={recipientName} />
        <input type="hidden" name="occasion" value={occasion} />

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
          <label htmlFor="relation">Кем вам приходится этот человек</label>
          <input id="relation" name="relation" placeholder="Например, родитель, коллега, ученик" required />
        </div>

        <div className={styles.field}>
          <label>Какие у него или у нее качества</label>
          <div className={styles.checkGrid}>
            {qualityOptions.map((option) => (
              <label key={option} className={styles.checkCard}>
                <input type="checkbox" name="qualities" value={option} />
                <span>{option}</span>
              </label>
            ))}
          </div>
        </div>

        <div className={styles.field}>
          <label>Что хочется пожелать</label>
          <div className={styles.checkGrid}>
            {wishOptions.map((option) => (
              <label key={option} className={styles.checkCard}>
                <input type="checkbox" name="wishes" value={option} />
                <span>{option}</span>
              </label>
            ))}
          </div>
        </div>

        <div className={styles.field}>
          <label htmlFor="personalDetail">Личная деталь, если есть</label>
          <textarea
            id="personalDetail"
            name="personalDetail"
            placeholder="Например, за что вы особенно благодарны, какую фразу часто вспоминаете или какой теплый момент хочется отметить."
          />
        </div>

        <div className={styles.field}>
          <label htmlFor="style">Стиль поздравления</label>
          <select id="style" name="style" defaultValue="warm-simple">
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
