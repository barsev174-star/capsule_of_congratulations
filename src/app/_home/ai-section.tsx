import styles from "./ai-section.module.css";

const sourceText = "Хочу поздравить коллегу с днём рождения. Он часто помогает, когда у кого-то возникает сложная задача, спокойно всё объясняет и всегда поддерживает команду.\n\nКоллектив ценит его за надёжность и чувство юмора. Хочется пожелать ему больше времени на себя, интересных проектов и чтобы работа приносила радость.";
const variants = [
  ["Аккуратно", "Поздравляю с днём рождения! Спасибо, что всегда готовы помочь, спокойно объяснить сложное и поддержать коллег.\n\nЖелаю интересных проектов, больше времени на себя и чтобы работа приносила радость и новые возможности."],
  ["Теплее", "С днём рождения! Спасибо за вашу надёжность, поддержку и умение спокойно помочь даже в самой сложной ситуации.\n\nРядом с вами команде легче и увереннее. Желаю больше времени на себя, интересных проектов, радости от работы и как можно больше хороших поводов для улыбки."],
  ["Живее", "С днём рождения! Вы тот коллега, к которому всегда можно прийти со сложной задачей и уйти не только с решением, но и с хорошим настроением.\n\nСпасибо за поддержку, надёжность и чувство юмора. Пусть впереди будет больше интересных проектов, времени на себя и работы, которая действительно радует!"]
];

export function AiSection() {
  return <section id="ai" className={`${styles.section} js-reveal`} aria-labelledby="ai-title"><div className={styles.shell}><div className={styles.card}>
    <div className={styles.intro}><div className={styles.badge}>AI-помощник</div><h2 id="ai-title" className={`${styles.title} text-balance`}>Не знаете, как написать красиво?</h2><p className={styles.subtitle}>Опишите человека и то, что хотите сказать. AI превратит ваши мысли в три готовых варианта, сохранив важные детали.</p><ul className={styles.features}><li>3 варианта за один запрос</li><li>Сохраняет ваши мысли и детали</li><li>Любой текст можно изменить</li></ul></div>
    <div className={styles.demoGrid}><article className={`${styles.sourceCard} js-motion-card`}><span className={styles.sourceLabel}>Что написал участник</span><p>{sourceText}</p><small>Мысли можно писать простыми словами — готовое поздравление сочинять не нужно.</small></article><div className={styles.flowArrow} aria-hidden="true">→</div><div className={styles.results}>{variants.map(([label, text], index) => <article key={label} className={`${styles.variant} js-motion-card`} style={{ "--result-delay": `${index * 120}ms` } as React.CSSProperties}><span className={styles.variantLabel}>{label}</span><p>{text}</p></article>)}</div></div>
  </div></div></section>;
}
