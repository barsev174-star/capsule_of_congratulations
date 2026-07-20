import styles from "./ai-section.module.css";

const sourceText = "Хочу поздравить коллегу с днём рождения. Он часто помогает со сложными задачами, спокойно всё объясняет и поддерживает команду.\n\nКоллектив ценит его за надёжность и чувство юмора. Хочется пожелать ему интересных проектов, больше времени на себя и радости от работы.";

const variants = [
  [
    "Аккуратно",
    "Поздравляю с днём рождения! Спасибо, что всегда готовы помочь, спокойно объяснить сложное и поддержать колег.\n\nЖелаю интересных проектов, больше времени на себя и чтобы работа приносила радость и новые возможности."
  ],
  [
    "Теплее",
    "С днём рождения! Спасибо за вашу надёжность, поддержку и умение помочь даже в сложной ситуации.\n\nРядом с вами команде легче и увереннее. Желаю больше времени на себя, интересных проектов и хороших поводов для улыбки."
  ],
  [
    "Живее",
    "С днём рождения! Вы тот коллега, к которому можно прийти со сложной задачей и уйти не только с решением, но и с хорошим настроением.\n\nПусть впереди будет больше интересных проектов, времени на себя и работы, которая действительно радует!"
  ]
];

export function AiSection() {
  return (
    <section id="ai" className={styles.section} aria-labelledby="ai-title">
      <div className={styles.shell}>
        <div className={styles.heading}>
          <h2 id="ai-title" className={`${styles.title} text-balance`}>
            Не знаете, как написать красиво?
          </h2>
          <p className={styles.subtitle}>
            Опишите человека своими словами — ИИ-помощник предложит три готовых варианта поздравления.
          </p>
          <p className={styles.meta}>Сохраняет ваши мысли · предлагает три варианта · любой текст можно изменить</p>
        </div>

        <div className={`${styles.demo} js-motion-card`}>
          <article className={styles.source}>
            <span className={styles.label}>Ваш запрос</span>
            <p className={styles.sourceText}>{sourceText}</p>
            <span className={styles.demoButton}>Помощь ИИ <span aria-hidden="true">✦</span></span>
          </article>

          <div className={styles.arrow} aria-hidden="true">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="5" y1="12" x2="19" y2="12" />
              <polyline points="12 5 19 12 12 19" />
            </svg>
          </div>

          <div className={styles.results}>
            {variants.map(([label, text], index) => (
              <article
                key={label}
                className={styles.variant}
                style={{ "--result-index": index } as React.CSSProperties}
              >
                <div className={styles.variantBody}>
                  <span className={styles.variantLabel}>{label}</span>
                  <p className={styles.variantText}>{text}</p>
                </div>
                <span className={styles.demoSelect}>Выбрать</span>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
