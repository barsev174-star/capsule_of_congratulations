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

/* До оплаты: открытка в процессе подготовки */
function PrepareIllustration() {
  return (
    <div className={styles.prepareArt} aria-hidden="true">
      <div className={styles.prepareSheet}>
        <span className={styles.prepareHeart}>♥</span>
        <span className={styles.prepareLine} />
        <span className={styles.prepareLineShort} />
      </div>
      <div className={styles.prepareNote}>♥</div>
      <div className={styles.preparePhoto} />
      <div className={styles.preparePencil} />
    </div>
  );
}

/* После оплаты: готовая открытка для передачи */
function DeliverIllustration() {
  return (
    <div className={styles.deliverArt} aria-hidden="true">
      <div className={styles.deliverCard}>
        <span>♥</span>
      </div>
      <div className={styles.deliverEnvelope}>
        <div className={styles.deliverFlap} />
        <div className={styles.deliverSeal}>♥</div>
      </div>
      <span className={styles.deliverSparkle}>✶</span>
      <svg className={styles.deliverSend} width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="7" y1="17" x2="17" y2="7" />
        <polyline points="7 7 17 7 17 17" />
      </svg>
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
          <p className={styles.totalPrice}>
            <span className={styles.totalLabel}>Финальная подготовка и передача открытки</span>
            <strong>399 ₽ единоразово</strong>
            <span className={styles.totalHint}>Без подписки и регулярных платежей</span>
          </p>
        </div>
        <div className={styles.grid}>
          <div className={styles.gridArrow} aria-hidden="true">
          <svg viewBox="0 0 120 60" fill="none">
            <path d="M6 46 C 38 14, 82 14, 110 38" pathLength={1} className={styles.gridArrowPath} />
            <path d="M104 30 L 112 39 L 101 43" pathLength={1} className={styles.gridArrowPath} />
          </svg>
          <span className={styles.gridPencil} />
        </div>
          <article className={`${styles.card} js-motion-card ${styles.freeCard}`}>
            <div className={styles.cardTop}>
              <div><h3>До оплаты</h3><p>Можно создать и полностью подготовить открытку:</p></div>
              <PrepareIllustration />
            </div>
            <FeatureList items={freeFeatures} />
          </article>
          <article className={`${styles.card} ${styles.paidCard} js-motion-card`}>
            <div className={styles.cardTop}>
              <div><h3>После оплаты</h3><p>Оплата открывает финальную подготовку и передачу открытки получателю:</p></div>
              <DeliverIllustration />
            </div>
            <div className={styles.price}>
              <strong>399 ₽</strong>
              <span>единоразово</span>
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
