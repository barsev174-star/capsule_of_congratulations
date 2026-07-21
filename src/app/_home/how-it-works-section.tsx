import styles from "./how-it-works-section.module.css";

const steps = [
  {
    number: "01",
    title: "Создайте открытку",
    text: "Укажите получателя, повод и выберите оформление.",
    illustration: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="16" y1="13" x2="8" y2="13" />
        <line x1="16" y1="17" x2="8" y2="17" />
        <line x1="10" y1="9" x2="8" y2="9" />
      </svg>
    )
  },
  {
    number: "02",
    title: "Отправьте ссылку участникам",
    text: "Участники добавят поздравления, а организатор — фотографии.",
    illustration: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="18" cy="5" r="3" />
        <circle cx="6" cy="12" r="3" />
        <circle cx="18" cy="19" r="3" />
        <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
        <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
      </svg>
    )
  },
  {
    number: "03",
    title: "Передайте открытку получателю",
    text: "После финальной проверки получатель откроет красивую страницу с поздравлениями, фотографиями и анимацией.",
    illustration: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
        <polyline points="22,6 12,13 2,6" />
        <path d="M12 13v7" />
        <path d="M9 16h6" />
      </svg>
    )
  }
];

export function HowItWorksSection() {
  return (
    <section id="how-it-works" className={styles.section}>
      <div className={styles.shell}>
        <div className={styles.heading}>
          <h2 className={`${styles.title} text-balance`}>Как это работает</h2>
          <p className={styles.subtitle}>Путь от идеи до тёплого подарка — всего три шага.</p>
        </div>

        <div className={styles.stepsGrid}>
          <div className={styles.line} aria-hidden="true" />
          {steps.map((step, index) => (
            <div
              key={step.number}
              className={styles.step}
              style={{ "--step-index": index } as React.CSSProperties}
            >
              <span className={styles.number}>{step.number}</span>
              <div className={styles.node}>{step.illustration}</div>
              <article className={styles.card}>
                <h3 className={styles.cardTitle}>{step.title}</h3>
                <p className={styles.cardText}>{step.text}</p>
              </article>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
