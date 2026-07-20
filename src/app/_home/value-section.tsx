import type { ReactNode } from "react";
import styles from "./value-section.module.css";

const values = [
  {
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
    title: "Собрать без хаоса",
    text: "Все поздравления находятся в одном месте, а не теряются среди сообщений.",
    illustration: "collect"
  },
  {
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
      </svg>
    ),
    title: "Сделать красиво",
    text: "Открытка выглядит как цельный подарок, а не как набор отдельных сообщений.",
    illustration: "beautiful"
  },
  {
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
        <circle cx="8.5" cy="8.5" r="1.5" />
        <polyline points="21 15 16 10 5 21" />
      </svg>
    ),
    title: "Добавить фото и слова",
    text: "Организатор добавляет фотографии, а участники — личные поздравления.",
    illustration: "photos"
  },
  {
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="20 12 20 22 4 22 4 12" />
        <rect x="2" y="7" width="20" height="5" />
        <line x1="12" y1="22" x2="12" y2="7" />
        <path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z" />
        <path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z" />
      </svg>
    ),
    title: "Подарить как событие",
    text: "Получатель открывает красиво оформленную открытку с атмосферой и ритмом.",
    illustration: "event"
  }
];

function CollectIllustration() {
  return (
    <div className={`${styles.illustration} ${styles.collectIllustration}`} aria-hidden="true">
      <div className={styles.chatSheet}>
        <div className={styles.chatRow}>
          <span className={styles.chatAvatar} style={{ background: "#f3d8cc" }} />
          <span className={styles.chatLine} />
        </div>
        <div className={styles.chatRow}>
          <span className={styles.chatAvatar} style={{ background: "#e4c2b0" }} />
          <span className={styles.chatLine} />
        </div>
        <div className={styles.chatRow}>
          <span className={styles.chatAvatar} style={{ background: "#d6b29c" }} />
          <span className={styles.chatLineShort} />
        </div>
      </div>
      <div className={styles.chatHeart}>♥</div>
    </div>
  );
}

function BeautifulIllustration() {
  return (
    <div className={`${styles.illustration} ${styles.beautifulIllustration}`} aria-hidden="true">
      <div className={styles.paperCard}>
        <span className={styles.paperHeart}>♥</span>
        <span className={styles.paperStroke} />
        <span className={styles.paperStroke} />
      </div>
      <div className={styles.paperNote}>
        <span className={styles.noteMiniHeart}>♥</span>
      </div>
      <div className={styles.branch}>
        <span />
        <span />
        <span />
      </div>
    </div>
  );
}

function PhotosIllustration() {
  return (
    <div className={`${styles.illustration} ${styles.photosIllustration}`} aria-hidden="true">
      <div className={styles.photoStack}>
        <div className={styles.photoCard} />
        <div className={styles.photoCard} />
        <div className={styles.photoCard} />
      </div>
      <div className={styles.wordsCard}>
        <span className={styles.wordsHeart}>♥</span>
        <span className={styles.wordsLine} />
        <span className={styles.wordsLineShort} />
      </div>
    </div>
  );
}

function EventIllustration() {
  return (
    <div className={`${styles.illustration} ${styles.eventIllustration}`} aria-hidden="true">
      <div className={styles.eventEnvelope}>
        <div className={styles.eventFlap} />
        <div className={styles.eventSeal}>♥</div>
      </div>
      <div className={styles.eventCard}>
        <span className={styles.eventPlay}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
            <polygon points="5 3 19 12 5 21 5 3" />
          </svg>
        </span>
      </div>
      <div className={styles.eventSparkle}>✶</div>
    </div>
  );
}

const illustrations: Record<string, () => ReactNode> = {
  collect: CollectIllustration,
  beautiful: BeautifulIllustration,
  photos: PhotosIllustration,
  event: EventIllustration
};

export function ValueSection() {
  return (
    <section id="value" className={styles.section}>
      <div className={styles.shell}>
        <div className={styles.heading}>
          <h2 className={`${styles.title} text-balance`}>Почему это лучше, чем поздравления в чате</h2>
          <p className={styles.subtitle}>Один человек собирает открытку, остальные просто добавляют тёплые слова.</p>
        </div>

        <div className={styles.grid}>
          {values.map((item, index) => {
            const Illustration = illustrations[item.illustration];
            return (
              <article
                key={item.title}
                className={`${styles.card} js-motion-card ${styles[`card${index + 1}`]}`}
              >
                <div className={styles.top}>
                  <div className={styles.iconWrap}>
                    <div className={styles.icon}>{item.icon}</div>
                    <span className={styles.index}>0{index + 1}</span>
                  </div>
                  <h3 className={styles.cardTitle}>{item.title}</h3>
                  <p className={styles.cardText}>{item.text}</p>
                </div>
                <Illustration />
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
