"use client";

import { useState, useTransition } from "react";
import styles from "./create-form.module.css";
import { cardTemplates, occasions } from "@/lib/cards/templates";

type CreatedCardPayload = {
  participantLink: string;
  manageLink: string;
  chatMessage: string;
  card: {
    recipientName: string;
    templateId: string;
    occasion: string;
  };
};

type ValidationIssue = {
  field: string;
  message: string;
};

const initialIssues: ValidationIssue[] = [];

export const CreateCardForm = () => {
  const [issues, setIssues] = useState<ValidationIssue[]>(initialIssues);
  const [result, setResult] = useState<CreatedCardPayload | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleSubmit = async (formData: FormData) => {
    setIssues(initialIssues);
    setResult(null);

    const response = await fetch("/api/cards", {
      method: "POST",
      body: formData
    });

    const payload = await response.json();

    if (!response.ok) {
      setIssues(payload.issues ?? [{ field: "form", message: payload.message ?? "Не удалось создать открытку." }]);
      return;
    }

    setResult(payload.result);
  };

  return (
    <div className={styles.layout}>
      <section className={styles.formCard}>
        <h2 className={styles.formTitle}>Собрать черновик открытки</h2>
        <p className={styles.hint}>
          На этом шаге создаем черновик: после него появятся ссылка для участников, ссылка управления и
          готовый текст для чата.
        </p>

        <form
          className={styles.form}
          action={(formData) => {
            startTransition(async () => {
              await handleSubmit(formData);
            });
          }}
        >
          {issues.length > 0 ? (
            <div className={styles.errorBox} aria-live="polite">
              <p>Нужно поправить несколько полей:</p>
              <ul className={styles.errorList}>
                {issues.map((issue) => (
                  <li key={`${issue.field}-${issue.message}`}>{issue.message}</li>
                ))}
              </ul>
            </div>
          ) : null}

          <section className={styles.section}>
            <h3 className={styles.sectionTitle}>1. Для кого и по какому поводу</h3>
            <div className={styles.radioGrid}>
              {occasions.map((occasion, index) => (
                <label key={occasion.id} className={styles.radioCard}>
                  <input type="radio" name="occasion" value={occasion.id} defaultChecked={index === 0} />
                  <span>{occasion.label}</span>
                </label>
              ))}
            </div>
            <div className={styles.fieldGrid}>
              <div className={styles.field}>
                <label htmlFor="recipientName">Имя получателя</label>
                <input id="recipientName" name="recipientName" placeholder="Например, Анна Викторовна" required />
              </div>
              <div className={styles.field}>
                <label htmlFor="fromLabel">От кого открытка</label>
                <input id="fromLabel" name="fromLabel" placeholder="Например, от 5Б класса" required />
              </div>
            </div>
          </section>

          <section className={styles.section}>
            <h3 className={styles.sectionTitle}>2. Кто организует</h3>
            <div className={styles.fieldGrid}>
              <div className={styles.field}>
                <label htmlFor="organizerName">Имя организатора</label>
                <input id="organizerName" name="organizerName" placeholder="Ваше имя" required />
              </div>
              <div className={styles.field}>
                <label htmlFor="organizerEmail">Email организатора</label>
                <input
                  id="organizerEmail"
                  name="organizerEmail"
                  type="email"
                  placeholder="name@example.com"
                  required
                />
              </div>
            </div>
          </section>

          <section className={styles.section}>
            <h3 className={styles.sectionTitle}>3. Детали события</h3>
            <div className={styles.fieldGrid}>
              <div className={styles.field}>
                <label htmlFor="eventDate">Дата события</label>
                <input id="eventDate" name="eventDate" type="date" />
              </div>
              <div className={styles.field}>
                <label htmlFor="description">Короткое описание</label>
                <textarea
                  id="description"
                  name="description"
                  placeholder="Например, хотим собрать теплое поздравление ко Дню учителя."
                />
              </div>
            </div>
          </section>

          <section className={styles.section}>
            <h3 className={styles.sectionTitle}>4. Выберите стиль открытки</h3>
            <div className={styles.templateGrid}>
              {cardTemplates.map((template, index) => (
                <label key={template.id} className={styles.templateCard}>
                  <input type="radio" name="templateId" value={template.id} defaultChecked={index === 0} />
                  <div className={styles.templatePreview} style={{ background: template.accent }} />
                  <span className={styles.templateName}>{template.name}</span>
                  <span className={styles.templateText}>{template.description}</span>
                </label>
              ))}
            </div>
          </section>

          <div className={styles.actions}>
            <button type="submit" className={styles.submitButton} disabled={isPending}>
              {isPending ? "Создаем черновик..." : "Создать открытку"}
            </button>
            <p className={styles.note}>Пока создаем только черновик. Оплата и публикация будут на следующем этапе.</p>
          </div>
        </form>
      </section>

      <aside className={styles.tips}>
        <section className={styles.tipCard}>
          <h2>Что получится после создания</h2>
          <ul>
            <li>Ссылка для участников, которую можно сразу отправить в чат.</li>
            <li>Секретная ссылка управления для организатора.</li>
            <li>Готовый текст приглашения в группу.</li>
          </ul>
        </section>

        <section className={styles.tipCard}>
          <h2>Что проверяем этим блоком</h2>
          <ul>
            <li>Люди понимают сценарий создания открытки без регистрации.</li>
            <li>Выбор шаблона не перегружает, а помогает быстрее стартовать.</li>
            <li>Черновик создается в один проход без лишних шагов.</li>
          </ul>
        </section>

        {result ? (
          <section className={styles.successCard} aria-live="polite">
            <h2>Черновик готов</h2>
            <p>Теперь уже можно звать участников и собирать первые поздравления.</p>
            <ul>
              <li>
                Ссылка для участников: <code>{result.participantLink}</code>
              </li>
              <li>
                Ссылка управления: <code>{result.manageLink}</code>
              </li>
              <li>
                Выбранный шаблон: <code>{result.card.templateId}</code>
              </li>
            </ul>
            <p>
              Текст для чата: <code>{result.chatMessage}</code>
            </p>
          </section>
        ) : null}
      </aside>
    </div>
  );
};
