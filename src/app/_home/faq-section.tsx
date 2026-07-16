"use client";

import { useState } from "react";
import styles from "./faq-section.module.css";

const faqs = [
  ["Нужна ли регистрация участникам?", "Нет. Участник переходит по ссылке, пишет поздравление и отправляет его без регистрации."],
  ["Можно ли собрать открытку от коллектива?", "Да. Организатор отправляет одну ссылку коллегам, и каждый добавляет своё поздравление."],
  ["Можно ли добавить фотографии?", "Да. Фотографии добавляет организатор открытки. Участники добавляют только поздравления."],
  ["Что увидит получатель?", "Получатель откроет оформленную открытку с поздравлениями, фотографиями, выбранными блоками и анимацией открытия."],
  ["Когда нужна оплата?", "Создание, оформление и сбор поздравлений доступны бесплатно. Оплата нужна перед финальной передачей открытки получателю."],
  ["Можно ли оплатить раньше и продолжить сбор?", "Да. После оплаты сбор останется открытым. Передать открытку можно будет после того, как организатор отдельно закроет сбор."]
] as const;

export function FaqSection() {
  const [openIndex, setOpenIndex] = useState(0);
  return <section id="faq" className={styles.section} aria-labelledby="faq-title"><div className={styles.shell}><div className={styles.heading}><h2 id="faq-title" className={`${styles.title} text-balance`}>Частые вопросы</h2></div><div className={styles.grid}>{faqs.map(([question, answer], index) => { const open = index === openIndex; return <article key={question} className={`${styles.card} js-motion-card ${open ? styles.open : ""}`}><h3><button type="button" className={styles.trigger} aria-expanded={open} onClick={() => setOpenIndex(open ? -1 : index)}><span>{question}</span><span aria-hidden="true">⌄</span></button></h3>{open ? <p className={styles.answer}>{answer}</p> : null}</article>; })}</div></div></section>;
}
