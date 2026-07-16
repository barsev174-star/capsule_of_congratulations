import styles from "./value-section.module.css";

const values = [
  {
    icon: (
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
    badge: "var(--accent-light)",
    title: "Собрать без хаоса",
    text: "Все поздравления находятся в одном месте, а не теряются среди сообщений."
  },
  {
    icon: (
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
      </svg>
    ),
    badge: "var(--accent-light)",
    title: "Сделать красиво",
    text: "Открытка выглядит как цельный подарок, а не как набор отдельных сообщений."
  },
  {
    icon: (
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
        <circle cx="8.5" cy="8.5" r="1.5" />
        <polyline points="21 15 16 10 5 21" />
      </svg>
    ),
    badge: "var(--accent-light)",
    title: "Добавить фото и слова",
    text: "Организатор добавляет фотографии, а участники — личные поздравления."
  },
  {
    icon: (
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="20 12 20 22 4 22 4 12" />
        <rect x="2" y="7" width="20" height="5" />
        <line x1="12" y1="22" x2="12" y2="7" />
        <path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z" />
        <path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z" />
      </svg>
    ),
    badge: "var(--accent-light)",
    title: "Подарить как событие",
    text: "Получатель открывает красиво оформленную открытку с атмосферой и ритмом."
  }
];

export function ValueSection() {
  return (
    <section className={styles.section}>
      <div className={styles.shell}>
        <div className={styles.heading}>
          <h2 className={`${styles.title} text-balance`}>Почему это лучше, чем поздравления в чате</h2>
          <p className={styles.subtitle}>Один человек собирает открытку, остальные просто добавляют тёплые слова.</p>
        </div>

        <div className={styles.grid}>
          {values.map((item, index) => (
            <article key={item.title} className={`${styles.card} js-motion-card`} style={{ "--card-accent": item.badge } as React.CSSProperties}>
              <div className={styles.iconWrap}>
                <div className={styles.icon}>{item.icon}</div>
                <span className={styles.index}>0{index + 1}</span>
              </div>
              <h3 className={styles.cardTitle}>{item.title}</h3>
              <p className={styles.cardText}>{item.text}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
