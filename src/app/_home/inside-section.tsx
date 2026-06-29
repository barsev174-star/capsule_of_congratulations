import styles from "./inside-section.module.css";

const features = [
  {
    icon: "✉️",
    title: "Обложка",
    text: "Имя, повод и настроение открытки."
  },
  {
    icon: "💬",
    title: "Поздравления",
    text: "Тёплые слова от всех участников."
  },
  {
    icon: "🖼️",
    title: "Фото",
    text: "Общие моменты и воспоминания."
  },
  {
    icon: "⭐",
    title: "Главное",
    text: "Большое личное поздравление."
  },
  {
    icon: "❝",
    title: "Лучшие фразы",
    text: "Самые сильные цитаты."
  },
  {
    icon: "❤️",
    title: "За что ценят",
    text: "Искренние слова о человеке."
  },
  {
    icon: "✨",
    title: "Анимация",
    text: "Красивое открытие подарка."
  }
];

export function InsideSection() {
  return (
    <section id="inside" className={styles.section}>
      <div className={styles.shell}>
        <div className={styles.heading}>
          <h2 className={`${styles.title} text-balance`}>Что будет внутри открытки</h2>
          <p className={styles.subtitle}>Всё, что делает подарок живым и личным.</p>
        </div>

        <div className={styles.grid}>
          {features.map((item) => (
            <article key={item.title} className={styles.card}>
              <span className={styles.icon}>{item.icon}</span>
              <h3 className={styles.cardTitle}>{item.title}</h3>
              <p className={styles.cardText}>{item.text}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
