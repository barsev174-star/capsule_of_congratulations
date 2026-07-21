import { CountUp } from "./count-up";
import styles from "./value-section.module.css";

type ChatMessage = {
  name: string;
  text: string;
  side: "left" | "right";
  color: string;
  file?: boolean;
};

const chatMessages: ChatMessage[] = [
  { name: "Оля", text: "С днём рождения! 🎉", side: "left", color: "#f3d8cc" },
  { name: "Дима", text: "Спасибо!", side: "right", color: "#e4c2b0" },
  { name: "Игорь", text: "Фото.jpg", side: "left", color: "#d6b29c", file: true },
  { name: "Катя", text: "Поздравляем! 🥳", side: "left", color: "#f0e0d4" }
];

const advantages = [
  {
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
    title: "Собрать вместе",
    text: "Каждый добавляет свои слова по одной ссылке."
  },
  {
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9L12 3z" />
        <path d="M19 15l.9 2.4L22 18.3l-2.1.9L19 21.5l-.9-2.3-2.1-.9 2.1-.9L19 15z" />
      </svg>
    ),
    title: "Оформить красиво",
    text: "Организатор выбирает стиль, фотографии и порядок."
  },
  {
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <polyline points="20 12 20 22 4 22 4 12" />
        <rect x="2" y="7" width="20" height="5" />
        <line x1="12" y1="22" x2="12" y2="7" />
        <path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z" />
        <path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z" />
      </svg>
    ),
    title: "Подарить как событие",
    text: "Получатель открывает готовую открытку с анимацией."
  }
];

export function ValueSection() {
  return (
    <section id="value" className={styles.section}>
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
              {chatMessages.map((message) => (
                <div
                  key={message.name}
                  className={`${styles.msg} ${message.side === "right" ? styles.msgRight : ""}`}
                >
                  <span className={styles.msgAvatar} style={{ background: message.color }} aria-hidden="true" />
                  <span className={`${styles.msgBubble} ${message.file ? styles.msgFile : ""}`}>
                    {message.file ? (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                        <circle cx="8.5" cy="8.5" r="1.5" />
                        <polyline points="21 15 16 10 5 21" />
                      </svg>
                    ) : null}
                    {message.text}
                  </span>
                </div>
              ))}
              <div className={styles.chatMore}>+ ещё 27 сообщений</div>
            </div>
          </div>

          <div className={styles.flow} aria-hidden="true">
            <svg viewBox="0 0 120 60" fill="none" className={styles.flowLine}>
              <path
                d="M6 46 C 38 14, 82 14, 110 38"
                pathLength={1}
                className={styles.flowPath}
              />
              <path
                d="M104 30 L 112 39 L 101 43"
                pathLength={1}
                className={styles.flowPath}
              />
            </svg>
          </div>

          <div className={styles.panel}>
            <p className={styles.panelLabel}>В открытке — всё вместе</p>
            <div className={styles.result}>
              <div className={styles.resultPreview} aria-hidden="true">
                <div className={styles.resultCardMini}>
                  <span className={styles.resultHeart}>♥</span>
                  <span className={styles.resultStroke} />
                  <span className={styles.resultStrokeShort} />
                </div>
                <div className={styles.resultPhotos}>
                  <span />
                  <span />
                  <span />
                </div>
              </div>
              <div className={styles.resultStats}>
                <div className={styles.stat}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                  </svg>
                  <span className={styles.statValue}>
                    <CountUp value={12} />
                  </span>
                  <span className={styles.statLabel}>поздравлений</span>
                </div>
                <div className={styles.stat}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
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
              <span className={styles.advantageIcon}>{item.icon}</span>
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
