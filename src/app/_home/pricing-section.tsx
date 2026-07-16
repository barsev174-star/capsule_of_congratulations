import styles from "./pricing-section.module.css";

const freeFeatures = [
  "Создание и оформление открытки",
  "Сбор до 100 поздравлений",
  "Добавление фотографий организатором",
  "Предварительный просмотр",
  "Голосование за подарок",
  "5 обращений к AI-помощнику"
];

const paidFeatures = [
  "Финальная подготовка",
  "Передача открытки получателю",
  "Анимация открытия",
  "Финальная gift-страница",
  "30 обращений к AI-помощнику всего",
  "Хранение открытки не менее 12 месяцев"
];

function FeatureList({ items }: { items: string[] }) {
  return <ul className={styles.list}>{items.map((item) => <li key={item}>{item}</li>)}</ul>;
}

export function PricingSection() {
  return (
    <section className={styles.section} aria-labelledby="pricing-title">
      <div className={styles.shell}>
        <div className={styles.heading}>
          <h2 id="pricing-title" className={`${styles.title} text-balance`}>Собрать открытку можно бесплатно</h2>
          <p>Оплата нужна только для финальной подготовки и передачи открытки получателю.</p>
        </div>
        <div className={styles.grid}>
          <article className={`${styles.card} js-motion-card`}>
            <h3>Что доступно бесплатно</h3>
            <FeatureList items={freeFeatures} />
          </article>
          <article className={`${styles.card} ${styles.paidCard} js-motion-card`}>
            <div className={styles.paidTop}>
              <h3>Что откроется после оплаты</h3>
              <div className={styles.price}><strong>399 ₽</strong><span>единоразово</span></div>
            </div>
            <FeatureList items={paidFeatures} />
            <p className={styles.note}>Без подписки и регулярных списаний</p>
          </article>
        </div>
      </div>
    </section>
  );
}
