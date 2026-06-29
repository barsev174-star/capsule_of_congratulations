import styles from "./how-it-works-section.module.css";

const steps = [
  {
    number: "01",
    title: "Создайте открытку",
    text: "Укажите имя, повод и получателя. Выберите структуру и настройте открытку."
  },
  {
    number: "02",
    title: "Отправьте ссылку участникам",
    text: "Каждый добавит поздравление, фото или воспользуется AI-помощником."
  },
  {
    number: "03",
    title: "Подарите финальную ссылку",
    text: "Получатель откроет открытку с анимацией, словами, фото и тёплыми моментами."
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

        <div className={styles.track}>
          {steps.map((step, index) => (
            <div key={step.number} className={styles.stepWrap}>
              <article className={styles.card}>
                <span className={styles.number}>{step.number}</span>
                <h3 className={styles.cardTitle}>{step.title}</h3>
                <p className={styles.cardText}>{step.text}</p>
              </article>
              {index < steps.length - 1 && (
                <div className={styles.arrow} aria-hidden="true">
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="5" y1="12" x2="19" y2="12" />
                    <polyline points="12 5 19 12 12 19" />
                  </svg>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
