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
  occasionText: string;
  messageLimit: number;
  onUseText: (text: string) => void;
  variant?: "default" | "join";
};

export const AiHelper = ({ cardId, recipientName, occasionText, messageLimit, onUseText, variant = "default" }: Props) => {
  const [issues, setIssues] = useState<string[]>([]);
  const [variants, setVariants] = useState<AiVariant[]>([]);
  const [activeVariantIndex, setActiveVariantIndex] = useState(0);
  const [insertFeedback, setInsertFeedback] = useState("");
  const [draftNotes, setDraftNotes] = useState("");
  const [remaining, setRemaining] = useState<number | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleGenerate = async (formData: FormData) => {
    setIssues([]);
    setVariants([]);
    setInsertFeedback("");

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
    setActiveVariantIndex(0);
    setRemaining(payload.result.remainingCardGenerations);
  };

  const isJoinVariant = variant === "join";
  const activeVariant = variants[activeVariantIndex] ?? variants[0];
  const variantTabs = ["Короткий", "Душевный", "Ваш стиль"];
  const aiFormId = `ai-helper-${cardId}`;
  const showRemaining = remaining !== null && remaining < 10;

  return (
    <section className={`${styles.aiCard} ${isJoinVariant ? styles.joinAiCard : ""}`}>
      <div className={styles.aiHeader}>
        <div>
          <h2 className={styles.sectionTitle}>
            {isJoinVariant ? "Нужна помощь с текстом?" : "Помочь с текстом через AI"}
          </h2>
          <p className={styles.hint}>
            {isJoinVariant
              ? "Набросайте мысли своими словами — AI соберет из них 3 варианта."
              : `Напишите мысли своими словами, даже в сыром виде. AI аккуратно соберет их в 3 черновика поздравления, и вы выберете лучший. Варианты сразу подстраиваются под лимит карточки: до ${messageLimit} символов.`}
          </p>
        </div>
        {isJoinVariant ? <span className={styles.wandIcon} aria-hidden="true" /> : null}
      </div>

      <form
        id={aiFormId}
        className={styles.form}
        action={(formData) => {
          formData.set("cardId", cardId);
          formData.set("recipientName", recipientName);
          formData.set("occasionText", occasionText);
          formData.set("messageLimit", String(messageLimit));
          formData.set("draftNotes", draftNotes);

          startTransition(async () => {
            await handleGenerate(formData);
          });
        }}
      >
        <input type="hidden" name="cardId" value={cardId} />
        <input type="hidden" name="recipientName" value={recipientName} />
        <input type="hidden" name="occasionText" value={occasionText} />
        <input type="hidden" name="messageLimit" value={messageLimit} />

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
          <div className={styles.fieldLabelRow}>
            <label htmlFor="draftNotes">{isJoinVariant ? "Что хотите сказать?" : "Что хотите сказать своими словами"}</label>
            {isJoinVariant ? <span className={styles.counter}>{draftNotes.length} / {messageLimit}</span> : null}
          </div>
          <textarea
            id="draftNotes"
            name="draftNotes"
            className={isJoinVariant ? styles.aiTextarea : undefined}
            value={draftNotes}
            onChange={(event) => setDraftNotes(event.target.value)}
            placeholder={
              isJoinVariant
                ? "Например: хочу пожелать здоровья, больше радости, чтобы все получалось. Ценю его поддержку и чувство юмора."
                : "Например: хочу пожелать любви, радости. Ценю скромность, целеустремленность, рад с тобой работать. Оставайся такой же веселой."
            }
            required
          />
          {!isJoinVariant ? (
            <span className={styles.hint}>
              Можно писать неровно и по пунктам. AI опирается на контекст открытки: <strong>{occasionText}</strong>.
            </span>
          ) : null}
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
          <button type="submit" className={isJoinVariant ? styles.aiButton : styles.submitButton} disabled={isPending}>
            {isJoinVariant ? <span className={styles.aiButtonIcon} aria-hidden="true" /> : null}
            {isPending ? "Готовим варианты..." : "Получить 3 варианта"}
          </button>
          {showRemaining ? <span className={styles.note}>Можно попробовать ещё {remaining} раз</span> : null}
        </div>
      </form>

      {isJoinVariant ? <p className={styles.privacyNote}>Ваш черновик нужен только для подготовки вариантов текста.</p> : null}

      {activeVariant ? (
        <div className={styles.variants}>
          <div className={styles.variantTabs} role="tablist" aria-label="Варианты поздравления">
            {variants.map((item, index) => (
              <button
                key={item.id}
                type="button"
                className={`${styles.variantTab} ${index === activeVariantIndex ? styles.variantTabActive : ""}`}
                onClick={() => setActiveVariantIndex(index)}
              >
                {variantTabs[index] ?? item.label}
              </button>
            ))}
          </div>
          <article className={styles.variantCard}>
            <h3 className={styles.variantTitle}>{variantTabs[activeVariantIndex] ?? activeVariant.label}</h3>
            <p className={styles.message}>{activeVariant.text}</p>
            <div className={styles.variantActions}>
              <button
                type="button"
                className={styles.useButton}
                onClick={() => {
                  onUseText(activeVariant.text);
                  setInsertFeedback("Текст вставлен в поздравление");
                }}
              >
                Вставить в поздравление
              </button>
              <button type="submit" form={aiFormId} className={styles.retryButton}>
                Попробовать ещё
              </button>
            </div>
            {insertFeedback ? <p className={styles.insertFeedback} aria-live="polite">{insertFeedback}</p> : null}
          </article>
        </div>
      ) : null}
    </section>
  );
};
