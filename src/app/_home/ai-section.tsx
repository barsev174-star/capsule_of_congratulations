import styles from "./ai-section.module.css";

const variants = [
  {
    label: "Короткий",
    text: "Спасибо за вашу поддержку и тепло. С вами становится спокойнее даже в непростой день."
  },
  {
    label: "Душевный",
    text: "Вы умеете поддержать так, что после разговора правда становится легче. Пусть рядом будет больше радости и людей, которые берегут вас."
  },
  {
    label: "Ваш стиль",
    text: "Спасибо за внимание, доброту и умение быть рядом. Пусть каждый день приносит больше спокойствия, тепла и приятных моментов."
  }
];

export function AiSection() {
  return (
    <section className={styles.section}>
      <div className={styles.shell}>
        <div className={styles.card}>
          <div className={styles.content}>
            <div className={styles.badge}>AI-помощник</div>
            <h2 className={`${styles.title} text-balance`}>Не знаете, как написать красиво?</h2>
            <p className={styles.subtitle}>
              Набросайте мысли своими словами — AI предложит несколько вариантов поздравления. Вы выбираете тот, который звучит по-настоящему.
            </p>
            <ul className={styles.features}>
              <li>3 варианта за один запрос</li>
              <li>Сохраняет вашу интонацию</li>
              <li>Можно отредактировать перед отправкой</li>
            </ul>
          </div>

          <div className={styles.demo} aria-hidden="true">
            <div className={styles.inputMock}>
              <span className={styles.inputLabel}>Черновик:</span>
              <span className={styles.inputText}>спасибо за поддержку и тепло...</span>
              <span className={styles.inputCursor} />
            </div>
            <div className={styles.variants}>
              {variants.map((variant) => (
                <div key={variant.label} className={styles.variant}>
                  <span className={styles.variantLabel}>{variant.label}</span>
                  <p>{variant.text}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
