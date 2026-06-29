import styles from "./faq-section.module.css";

const faqs = [
  {
    question: "Нужна ли регистрация участникам?",
    answer: "Нет. Участники переходят по ссылке и сразу пишут поздравление. Регистрироваться нужно только организатору."
  },
  {
    question: "Можно ли собрать открытку от коллектива?",
    answer: "Да, это один из главных сценариев. Отправьте ссылку коллегам, и каждый добавит своё поздравление."
  },
  {
    question: "Можно ли добавить фото?",
    answer: "Конечно. Организатор и участники могут загружать фото, которые красиво встроятся в финальную открытку."
  },
  {
    question: "Что увидит получатель?",
    answer: "Получатель откроет красивую анимированную открытку со всеми поздравлениями, фото и тёплыми моментами."
  },
  {
    question: "Когда доступна финальная ссылка?",
    answer: "Собрать открытку можно бесплатно. Оплата нужна только для публикации финальной ссылки, которую вы отправите получателю."
  }
];

export function FaqSection() {
  return (
    <section id="faq" className={styles.section}>
      <div className={styles.shell}>
        <div className={styles.heading}>
          <h2 className={`${styles.title} text-balance`}>Частые вопросы</h2>
          <p className={styles.subtitle}>Всё, что поможет быстро начать.</p>
        </div>

        <div className={styles.grid}>
          {faqs.map((item) => (
            <article key={item.question} className={styles.card}>
              <h3 className={styles.question}>{item.question}</h3>
              <p className={styles.answer}>{item.answer}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
