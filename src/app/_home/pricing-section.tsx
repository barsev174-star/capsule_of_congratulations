import styles from "./pricing-section.module.css";
import { startCardFromShowcaseAction } from "../home-actions";

const freeFeatures = [
  "Создание открытки без регистрации",
  "Получатель, повод, подпись «От кого» и оформление",
  "Открытый сбор поздравлений",
  "Сбор до 100 поздравлений",
  "Модерация и изменение порядка поздравлений",
  "Добавление фотографий организатором",
  "Предварительный просмотр",
  "Голосование за подарок",
  "До 5 запросов к ИИ-помощнику"
];

const paidFeatures = [
  "Доступ к финальной подготовке открытки",
  "Передача открытки получателю",
  "Персональная ссылка на готовую открытку",
  "Анимация открытия и доступ получателя к поздравлениям и фотографиям",
  "До 30 запросов к ИИ-помощнику всего на открытку",
  "Хранение открытки не менее 12 месяцев"
];

function FeatureList({ items }: { items: string[] }) {
  return (
    <ul className={styles.list}>
      {items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  );
}

function GiftIllustration() {
  return (
    <div className={styles.giftArt} aria-hidden="true">
      <div className={styles.giftBox}>
        <div className={styles.giftRibbon} />
        <div className={styles.giftBow}>
          <span />
          <span />
        </div>
      </div>
      <div className={styles.giftHeart}>♥</div>
    </div>
  );
}

export function PricingSection() {
  return (
    <section id="price" className={styles.section} aria-labelledby="pricing-title">
      <div className={styles.shell}>
        <div className={styles.heading}>
          <h2 id="pricing-title" className={`${styles.title} text-balance`}>
            Собрать открытку можно бесплатно
          </h2>
          <p>Оплата нужна только для финальной подготовки и передачи открытки получателю.</p>
          <p className={styles.totalPrice}><strong>Финальная открытка — 399 ₽ единоразово</strong><span>Без подписки и регулярных платежей</span></p>
        </div>
        <div className={styles.grid}>
          <article className={`${styles.card} js-motion-card ${styles.freeCard}`}>
            <div className={styles.cardTop}>
              <div><h3>До оплаты</h3><p>Можно создать и полностью подготовить открытку:</p></div>
              <GiftIllustration />
            </div>
            <FeatureList items={freeFeatures} />
          </article>
          <article className={`${styles.card} ${styles.paidCard} js-motion-card`}>
            <div className={styles.cardTop}>
              <div><h3>После оплаты — 399 ₽</h3><p>Оплата открывает финальную подготовку и передачу открытки получателю:</p></div>
              <div className={styles.price}>
                <strong>399 ₽</strong>
                <span>единоразово</span>
              </div>
            </div>
            <FeatureList items={paidFeatures} />
            <p className={styles.note}>Оплата не закрывает сбор автоматически. Организатор сам решает, когда завершить сбор и передать открытку получателю.</p>
          </article>
        </div>
        <div className={styles.action}>
          <form action={startCardFromShowcaseAction}>
            <button type="submit">Создать открытку бесплатно</button>
          </form>
          <p>Оплатить можно позже, когда открытка будет готова к передаче.</p>
        </div>
      </div>
    </section>
  );
}
