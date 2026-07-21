import styles from "./how-it-works-section.module.css";

/* Предметные иконки шагов в тёплой палитре Slovesto (декоративные). */

function CreateCardIcon() {
  return (
    <svg width="30" height="30" viewBox="0 0 48 48" fill="none" aria-hidden="true">
      <g transform="rotate(-6 20 24)">
        <rect x="9" y="8" width="22" height="31" rx="3.5" fill="var(--surface-strong)" stroke="var(--text)" strokeOpacity="0.45" strokeWidth="1.6" />
        <path d="M20 16.5c-1.3-1.9-4.1-1.7-5 .3-.8 1.9.6 3.7 5 6.2 4.4-2.5 5.8-4.3 5-6.2-.9-2-3.7-2.2-5-.3z" fill="var(--accent)" />
        <path d="M14.5 28.5h11M14.5 33h7.5" stroke="var(--text)" strokeOpacity="0.3" strokeWidth="1.5" strokeLinecap="round" />
      </g>
      <g transform="rotate(40 35 27)">
        <rect x="32.4" y="13" width="5.2" height="22" rx="2.6" fill="var(--accent)" />
        <path d="M32.4 35l2.6 5.4 2.6-5.4z" fill="#8c6758" />
      </g>
    </svg>
  );
}

function ShareLinkIcon() {
  return (
    <svg width="30" height="30" viewBox="0 0 48 48" fill="none" aria-hidden="true">
      {/* точки-участники */}
      <circle cx="9" cy="11" r="2.7" fill="var(--accent-soft)" />
      <circle cx="39" cy="10" r="2.7" fill="var(--accent-soft)" />
      <circle cx="40" cy="37" r="2.7" fill="var(--accent-soft)" />
      <circle cx="8" cy="38" r="2.7" fill="var(--accent-soft)" />
      {/* звенья ссылки */}
      <path d="M21 27a5.4 5.4 0 0 1 0-7.6l3.2-3.2a5.4 5.4 0 0 1 7.6 7.6" stroke="var(--accent)" strokeWidth="2.6" strokeLinecap="round" />
      <path d="M27 21a5.4 5.4 0 0 1 0 7.6l-3.2 3.2a5.4 5.4 0 0 1-7.6-7.6" stroke="var(--accent)" strokeWidth="2.6" strokeLinecap="round" />
    </svg>
  );
}

function DeliverIcon() {
  return (
    <svg width="30" height="30" viewBox="0 0 48 48" fill="none" aria-hidden="true">
      {/* открытка выходит из конверта */}
      <g transform="rotate(-4 24 14)">
        <rect x="16" y="4" width="16" height="15" rx="2.5" fill="var(--surface-strong)" stroke="var(--text)" strokeOpacity="0.45" strokeWidth="1.5" />
        <path d="M24 9.2c-.9-1.3-2.8-1.2-3.4.2-.6 1.3.4 2.6 3.4 4.3 3-1.7 4-3 3.4-4.3-.6-1.4-2.5-1.5-3.4-.2z" fill="var(--accent)" />
      </g>
      {/* конверт */}
      <rect x="10" y="15" width="28" height="21" rx="3.5" fill="var(--accent-light)" stroke="var(--accent)" strokeWidth="1.6" />
      <path d="M11.5 17.5L24 26l12.5-8.5" stroke="var(--accent)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      {/* искра */}
      <path d="M39 4l1.1 2.7 2.7 1.1-2.7 1.1L39 11.6l-1.1-2.7-2.7-1.1 2.7-1.1z" fill="#E9A94B" />
    </svg>
  );
}

const steps = [
  {
    number: "01",
    title: "Создайте открытку",
    text: "Укажите получателя, повод и выберите оформление.",
    illustration: <CreateCardIcon />
  },
  {
    number: "02",
    title: "Отправьте ссылку участникам",
    text: "Участники добавят поздравления, а организатор — фотографии.",
    illustration: <ShareLinkIcon />
  },
  {
    number: "03",
    title: "Передайте открытку получателю",
    text: "После финальной проверки получатель откроет открытку с поздравлениями, фотографиями и анимацией.",
    illustration: <DeliverIcon />
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
