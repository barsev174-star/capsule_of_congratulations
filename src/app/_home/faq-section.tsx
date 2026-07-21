"use client";

import { useState } from "react";
import styles from "./faq-section.module.css";

const faqs = [
  ["Нужна ли регистрация?", "Нет. Ни организатору, ни участникам не нужна регистрация. Организатор управляет открыткой по персональной защищённой ссылке."],
  ["Можно ли собрать открытку от коллектива?", "Да. Организатор отправляет одну ссылку коллегам, и каждый добавляет своё поздравление."],
  ["Можно ли добавить фотографии?", "Да. Фотографии добавляет организатор открытки. Участники добавляют только поздравления."],
  ["Что увидит получатель?", "Получатель откроет оформленную открытку с поздравлениями, фотографиями, выбранными блоками и анимацией открытия."],
  ["Сколько стоит открытка?", "Создать, настроить и собрать открытку можно бесплатно. Оплата 399 ₽ нужна только для финальной подготовки и передачи открытки получателю. Это разовый платёж без подписки."],
  ["Можно ли сначала собрать открытку, а оплатить позже?", "Да. Сначала можно собрать поздравления, добавить фотографии, настроить оформление и проверить предварительную версию. Оплата потребуется только перед передачей открытки получателю."],
  ["Что происходит после оплаты?", "После подтверждения оплаты открывается финальная подготовка и расширяется лимит ИИ до 30 запросов на открытку. Сбор поздравлений не закрывается автоматически — организатор сам завершает его и передаёт открытку получателю."]
] as const;

const leftFaqs = faqs.slice(0, 3);
const rightFaqs = faqs.slice(3);

export function FaqSection() {
  // По умолчанию открыт вопрос «Сколько стоит открытка?»
  const [openIndex, setOpenIndex] = useState<number>(4);

  const renderFaq = ([question, answer]: readonly [string, string], index: number) => {
    const open = index === openIndex;
    return (
      <article key={question} className={`${styles.card} js-motion-card ${open ? styles.open : ""}`}>
        <h3>
          <button
            type="button"
            className={styles.trigger}
            aria-expanded={open}
            onClick={() => setOpenIndex(open ? -1 : index)}
          >
            <span>{question}</span>
            <span aria-hidden="true">⌄</span>
          </button>
        </h3>
        <div className={styles.answerWrap}>
          <p className={styles.answer}>{answer}</p>
        </div>
      </article>
    );
  };

  return (
    <section id="faq" className={styles.section} aria-labelledby="faq-title">
      <div className={styles.shell}>
        <div className={styles.heading}>
          <h2 id="faq-title" className={`${styles.title} text-balance`}>Частые вопросы</h2>
        </div>
        <div className={styles.grid}>
          <div className={styles.column}>{leftFaqs.map((item, i) => renderFaq(item, i))}</div>
          <div className={styles.column}>{rightFaqs.map((item, i) => renderFaq(item, i + 3))}</div>
        </div>
      </div>
    </section>
  );
}
