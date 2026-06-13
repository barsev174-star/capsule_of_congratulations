import styles from "./final-card.module.css";
import type { FinalCardViewModel } from "@/lib/final-card/view-model";

type Props = {
  model: FinalCardViewModel;
};

const styleClassMap = {
  "warm-classic": styles["warm-classic"],
  "team-modern": styles["team-modern"],
  "bright-celebration": styles["bright-celebration"],
  "gentle-personal": styles["gentle-personal"]
};

export const FinalCard = ({ model }: Props) => {
  return (
    <main className={`${styles.page} ${styleClassMap[model.style]}`}>
      <div className={styles.shell}>
        <div className={styles.canvas}>
          {model.blocks.map((block) => {
            if (block.id === "hero") {
              return (
                <section key={block.id} className={styles.hero}>
                  <div className={styles.heroGlow} />
                  <div className={styles.heroMain}>
                    <p className={styles.eyebrow}>Открытка от всей группы</p>
                    <h1 className={styles.title}>{model.recipientName}</h1>
                    <p className={styles.subtitle}>
                      Эту открытку для тебя собрали <strong>{model.fromLabel}</strong>. Здесь уже живут теплые слова,
                      важные воспоминания и атмосфера общего подарка.
                    </p>
                    <div className={styles.heroMeta}>
                      <span className={styles.metaPill}>{model.participantCount} участников</span>
                      <span className={styles.metaPill}>{model.occasionLabel}</span>
                    </div>
                  </div>

                  <aside className={styles.heroAside}>
                    <div className={styles.heroStatCard}>
                      <span className={styles.heroStatLabel}>Собрано для тебя</span>
                      <strong className={styles.heroStatValue}>{model.participantCount}</strong>
                      <span className={styles.heroStatText}>личных сообщений и теплых слов</span>
                    </div>
                    <div className={styles.heroNoteCard}>
                      <span className={styles.heroNoteLabel}>Повод</span>
                      <p className={styles.heroNoteText}>{model.occasionLabel}</p>
                    </div>
                  </aside>
                </section>
              );
            }

            if (block.id === "summary") {
              return (
                <section key={block.id} className={`${styles.summary} ${styles.section}`}>
                  <p className={styles.sectionEyebrow}>Общий взгляд</p>
                  <h2 className={styles.sectionTitle}>{model.summaryTitle}</h2>
                  <p className={styles.sectionText}>{model.summaryText}</p>
                </section>
              );
            }

            if (block.id === "qualities") {
              return (
                <section key={block.id} className={`${styles.qualities} ${styles.section}`}>
                  <p className={styles.sectionEyebrow}>Как тебя чувствуют рядом</p>
                  <h2 className={styles.sectionTitle}>Какой ты для нас</h2>
                  <div className={styles.chipList}>
                    {model.qualities.map((quality) => (
                      <span key={quality} className={styles.chip}>
                        {quality}
                      </span>
                    ))}
                  </div>
                </section>
              );
            }

            if (block.id === "messages") {
              return (
                <section key={block.id} className={`${styles.messages} ${styles.section}`}>
                  <div className={styles.sectionHeader}>
                    <div>
                      <p className={styles.sectionEyebrow}>Главное</p>
                      <h2 className={styles.sectionTitle}>Поздравления</h2>
                    </div>
                    <span className={styles.sectionBadge}>{model.contributions.length} сообщений</span>
                  </div>

                  <div className={`${styles.grid} ${styles.messagesGrid}`}>
                    {model.contributions.map((item, index) => (
                      <article
                        key={item.id}
                        className={`${styles.card} ${index % 3 === 0 ? styles.cardAccent : ""}`}
                      >
                        <div className={styles.cardHeader}>
                          <span className={styles.author}>{item.authorName}</span>
                          {item.authorRole ? <span className={styles.role}>{item.authorRole}</span> : null}
                        </div>
                        <p className={styles.message}>{item.message}</p>
                      </article>
                    ))}
                  </div>
                </section>
              );
            }

            if (block.id === "memories") {
              return (
                <section key={block.id} className={`${styles.memories} ${styles.section}`}>
                  <p className={styles.sectionEyebrow}>Теплые моменты</p>
                  <h2 className={styles.sectionTitle}>Воспоминания, которые хочется сохранить</h2>
                  <div className={`${styles.grid} ${styles.memoriesGrid}`}>
                    {model.memories.map((item, index) => (
                      <article
                        key={item.id}
                        className={`${styles.memoryCard} ${index % 2 === 0 ? styles.memoryCardTilt : ""}`}
                      >
                        <h3 className={styles.memoryTitle}>{item.title}</h3>
                        <p className={styles.sectionText}>{item.caption}</p>
                      </article>
                    ))}
                  </div>
                </section>
              );
            }

            if (block.id === "quotes") {
              return (
                <section key={block.id} className={`${styles.quotes} ${styles.section}`}>
                  <p className={styles.sectionEyebrow}>Фразы, которые запоминаются</p>
                  <h2 className={styles.sectionTitle}>Лучшие фразы</h2>
                  <div className={`${styles.grid} ${styles.quotesGrid}`}>
                    {model.quotes.map((quote) => (
                      <article key={quote} className={styles.quoteCard}>
                        <span className={styles.quoteMark}>“</span>
                        <p className={styles.message}>{quote}</p>
                      </article>
                    ))}
                  </div>
                </section>
              );
            }

            if (block.id === "closing") {
              return (
                <section key={block.id} className={styles.closing}>
                  <div className={styles.closingContent}>
                    <p className={styles.sectionEyebrow}>Финальный аккорд</p>
                    <h2 className={styles.sectionTitle}>Спасибо, что вы вместе</h2>
                    <p className={styles.sectionText}>
                      Это уже не просто список сообщений, а собранный цифровой подарок. Дальше мы будем усиливать
                      медиа, публикацию и финальный вау-эффект вручения.
                    </p>
                  </div>
                  <div className={styles.actions}>
                    <button type="button" className={styles.primaryButton}>
                      Сохранить открытку
                    </button>
                    <button type="button" className={styles.secondaryButton}>
                      Создать такую же
                    </button>
                  </div>
                </section>
              );
            }

            return null;
          })}
        </div>
      </div>
    </main>
  );
};
