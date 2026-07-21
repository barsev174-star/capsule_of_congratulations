import Image from "next/image";
import { CountUp } from "./count-up";
import { ChatLiveliness } from "./chat-liveliness";
import styles from "./value-section.module.css";

const advantages = [
  {
    icon: (
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
    decor: styles.decorCollect,
    title: "Собрать вместе",
    text: "Каждый добавляет свои слова по одной ссылке."
  },
  {
    icon: (
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9L12 3z" />
        <path d="M19 15l.9 2.4L22 18.3l-2.1.9L19 21.5l-.9-2.3-2.1-.9 2.1-.9L19 15z" />
      </svg>
    ),
    decor: styles.decorPolaroid,
    title: "Оформить красиво",
    text: "Организатор выбирает стиль, фотографии и порядок."
  },
  {
    icon: (
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <polyline points="20 12 20 22 4 22 4 12" />
        <rect x="2" y="7" width="20" height="5" />
        <line x1="12" y1="22" x2="12" y2="7" />
        <path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z" />
        <path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z" />
      </svg>
    ),
    decor: styles.decorEnvelope,
    title: "Подарить как событие",
    text: "Получатель открывает готовую открытку с анимацией."
  }
];

export function ValueSection() {
  return (
    <section id="value" className={styles.section}>
      <ChatLiveliness />
      <div className={styles.shell}>
        <div className={styles.heading}>
          <h2 className={`${styles.title} text-balance`}>Не поток сообщений, а настоящий подарок</h2>
          <p className={styles.subtitle}>
            Поздравления не теряются в чате, а складываются в красивую открытку, которую хочется пересматривать.
          </p>
        </div>

        <div className={styles.comparison}>
          <div className={styles.panel}>
            <p className={styles.panelLabel}>В чате поздравления теряются</p>
            <div className={styles.chat}>
              <div className={styles.msg}>
                <span className={styles.msgAvatar} style={{ background: "#f3d8cc" }} aria-hidden="true" />
                <span className={styles.msgBubble}>С днём рождения! 🎉</span>
              </div>
              <div className={`${styles.msg} ${styles.msgRight}`}>
                <span className={styles.msgAvatar} style={{ background: "#e4c2b0" }} aria-hidden="true" />
                <span className={styles.msgBubble}>Спасибо, что ты рядом</span>
              </div>
              <div className={`${styles.msg} ${styles.msgPhoto}`}>
                <span className={styles.msgAvatar} style={{ background: "#d6b29c" }} aria-hidden="true" />
                <span className={styles.msgBubble}>
                  <Image
                    src="/assets/landing/demo-chat-photo.jpg"
                    alt="Друзья поздравляют именинницу за праздничным столом"
                    width={480}
                    height={320}
                    className={styles.msgImage}
                  />
                </span>
              </div>
              <div className={`${styles.msg} ${styles.msgLast}`}>
                <span className={styles.msgAvatar} style={{ background: "#f0e0d4" }} aria-hidden="true" />
                <span className={styles.msgBubble}>Это тебе от нас ❤️</span>
              </div>
              <div className={styles.msgGhost} aria-hidden="true">
                <span className={styles.msgAvatar} style={{ background: "#e9d3c4" }} />
                <span className={styles.msgBubble}>Поздравляем! 🥳</span>
              </div>
              <div className={styles.chatMore}>+ ещё 27 сообщений</div>
            </div>
          </div>

          <div className={styles.flow} aria-hidden="true">
            <svg viewBox="0 0 140 60" fill="none" className={styles.flowLine}>
              <path
                d="M6 46 C 44 12, 96 12, 128 38"
                pathLength={1}
                className={styles.flowPath}
              />
              <path
                d="M122 30 L 132 39 L 121 43"
                pathLength={1}
                className={styles.flowPath}
              />
            </svg>
            <span className={styles.flowSparkle}>✶</span>
          </div>

          <div className={styles.panel}>
            <p className={styles.panelLabel}>В открытке — всё вместе</p>
            <div className={styles.result}>
              <span className={styles.resultFlower} aria-hidden="true">
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="8" r="3.2" />
                  <path d="M12 11.5c-4 0-6.5 2.6-6.5 6.5M12 11.5c4 0 6.5 2.6 6.5 6.5M12 11.5V21" />
                </svg>
              </span>
              <div className={styles.resultCollage}>
                <Image
                  src="/assets/landing/demo-collage-1.jpg"
                  alt="Коллеги вручают подарок имениннице в офисе"
                  width={520}
                  height={347}
                  className={styles.collageMain}
                />
                <Image
                  src="/assets/landing/demo-collage-2.jpg"
                  alt=""
                  width={420}
                  height={630}
                  className={styles.collageSmall}
                />
                <Image
                  src="/assets/landing/demo-chat-photo.jpg"
                  alt=""
                  width={480}
                  height={320}
                  className={styles.collageTiny}
                />
              </div>
              <p className={styles.resultGreeting}>
                С днём рождения! Спасибо, что ты рядом.<br />
                Это тебе от всех нас ❤️
              </p>
              <div className={styles.resultStats}>
                <div className={styles.stat}>
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                  </svg>
                  <span className={styles.statValue}>
                    <CountUp value={12} />
                  </span>
                  <span className={styles.statLabel}>поздравлений</span>
                </div>
                <div className={styles.stat}>
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                    <circle cx="8.5" cy="8.5" r="1.5" />
                    <polyline points="21 15 16 10 5 21" />
                  </svg>
                  <span className={styles.statValue}>
                    <CountUp value={6} />
                  </span>
                  <span className={styles.statLabel}>фотографий</span>
                </div>
              </div>
              <p className={styles.resultNote}>Всё собрано в одном подарке</p>
            </div>
          </div>
        </div>

        <ul className={styles.advantages}>
          {advantages.map((item) => (
            <li key={item.title} className={`${styles.advantage} js-motion-card`}>
              <span className={styles.advantageIcon}>
                {item.icon}
                <span className={`${styles.advantageDecor} ${item.decor}`} aria-hidden="true" />
              </span>
              <div>
                <h3 className={styles.advantageTitle}>{item.title}</h3>
                <p className={styles.advantageText}>{item.text}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
