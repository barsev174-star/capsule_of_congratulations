import Link from "next/link";
import type { CardMediaAsset, Contribution } from "@/lib/cards/types";
import { getFinalCardMessageLayoutProfile } from "@/lib/final-card/message-layout-rules";
import type { FinalCardViewModel } from "@/lib/final-card/view-model";
import styles from "./final-card.module.css";

type Props = {
  model: FinalCardViewModel;
};

const styleClassMap = {
  "warm-classic": styles["warm-classic"],
  "team-modern": styles["team-modern"],
  "bright-celebration": styles["bright-celebration"],
  "gentle-personal": styles["gentle-personal"],
  "paper-birthday": styles["paper-birthday"]
};

const trimMessage = (message: string, maxChars: number) =>
  message.length > maxChars ? `${message.slice(0, maxChars - 1).trimEnd()}...` : message;

const getMediaAssetBySlot = (mediaAssets: CardMediaAsset[], slot: CardMediaAsset["slot"]) =>
  mediaAssets.find((item) => item.slot === slot);

const renderMessageCard = (item: Contribution, index: number, maxChars: number) => (
  <article
    key={item.id}
    className={`${styles.card} ${index === 0 ? styles.cardSpotlight : index % 3 === 0 ? styles.cardAccent : ""}`}
  >
    <div className={styles.cardHeader}>
      <span className={styles.author}>{item.authorName}</span>
      {item.authorRole ? <span className={styles.role}>{item.authorRole}</span> : null}
    </div>
    <p className={styles.message}>{trimMessage(item.message, maxChars)}</p>
  </article>
);

const renderHeroAside = (model: FinalCardViewModel) => {
  const allowHeroPhotos: boolean = false;
  const primary = null as CardMediaAsset | null;
  const secondary = null as CardMediaAsset | null;

  if (allowHeroPhotos && primary) {
    return (
      <aside className={styles.heroAside}>
        <div className={styles.heroPhotoStack}>
          <figure className={`${styles.heroPhotoFrame} ${styles.heroPhotoPrimary}`}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={primary.publicUrl}
              alt={primary.captionTitle || primary.captionSubtitle || "Фото открытки"}
              className={styles.heroPhotoImage}
            />
            <figcaption className={styles.heroPhotoCaption}>
              {primary.captionTitle ? <strong>{primary.captionTitle}</strong> : null}
              <span>{primary.captionSubtitle || primary.captionTitle || "Теплый момент для этой открытки"}</span>
            </figcaption>
          </figure>

          {secondary ? (
            <figure className={`${styles.heroPhotoFrame} ${styles.heroPhotoSecondary}`}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={secondary.publicUrl}
                alt={secondary.captionTitle || secondary.captionSubtitle || "Еще одно фото открытки"}
                className={styles.heroPhotoImage}
              />
            </figure>
          ) : null}
        </div>

        <div className={styles.heroFactStrip}>
          <div className={styles.heroFact}>
            <span className={styles.heroFactLabel}>Собрали</span>
            <strong>{model.participantCount}</strong>
          </div>
          <div className={styles.heroFact}>
            <span className={styles.heroFactLabel}>Повод</span>
            <strong>{model.occasionLabel}</strong>
          </div>
        </div>
      </aside>
    );
  }

  return (
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
  );
};

const renderMediaFigure = (
  asset: CardMediaAsset | undefined,
  slot: CardMediaAsset["slot"],
  title: string,
  fallbackText: string,
  className: string
) => {
  const frameClassName =
    slot === "portrait"
      ? `${className} ${styles.mediaFrameTiltLeft}`
      : slot === "landscape-b"
        ? `${className} ${styles.mediaFrameTiltRight}`
        : `${className} ${styles.mediaFrameTiltLeft}`;

  return (
    <figure className={frameClassName}>
      {asset ? (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={asset.publicUrl}
            alt={asset.captionTitle || asset.captionSubtitle || title}
            className={styles.mediaImage}
          />
          <figcaption className={styles.mediaCaption}>
            {asset.captionTitle ? <strong className={styles.mediaCaptionTitle}>{asset.captionTitle}</strong> : null}
            <span className={styles.mediaCaptionSubtitle}>
              {asset.captionSubtitle || asset.captionTitle || title}
            </span>
          </figcaption>
        </>
      ) : (
        <>
          <span className={styles.mediaLabel}>{title}</span>
          <p className={styles.mediaHint}>{fallbackText}</p>
        </>
      )}
    </figure>
  );
};

const renderMediaRail = (model: FinalCardViewModel) => {
  const messageMediaAssets = model.messageMediaAssets;

  if (model.messageMediaLayout === "landscape-pair" || model.messageMediaLayout === "landscape-trio") {
    return (
      <div
        className={`${styles.mediaRail} ${
          model.messageMediaLayout === "landscape-trio" ? styles.mediaRailTrio : ""
        }`}
      >
        {renderMediaFigure(
          messageMediaAssets[0],
          "landscape-a",
          "Горизонтальное фото A",
          "Здесь может появиться первое горизонтальное фото.",
          styles.mediaCardLandscape
        )}
        {renderMediaFigure(
          messageMediaAssets[1],
          "landscape-b",
          "Горизонтальное фото B",
          "Здесь может появиться второе горизонтальное фото.",
          styles.mediaCardLandscape
        )}
        {model.messageMediaLayout === "landscape-trio"
          ? renderMediaFigure(
              messageMediaAssets[2],
              "landscape-c",
              "Горизонтальное фото C",
              "Здесь может появиться третье горизонтальное фото.",
              styles.mediaCardLandscape
            )
          : null}
      </div>
    );
  }

  return (
    <div className={styles.mediaRail}>
      {renderMediaFigure(
        messageMediaAssets[0],
        "portrait",
        "Вертикальное фото",
        "Здесь предусмотрено место под одно заметное вертикальное фото.",
        styles.mediaCardPortrait
      )}
    </div>
  );
};

const renderMessagesLayout = (model: FinalCardViewModel) => {
  const profile = getFinalCardMessageLayoutProfile(model.messageLayoutMode);

  if (profile.pageVariant === "column-media") {
    return (
      <div className={styles.messageSplitFixed}>
        <div className={styles.messageColumnScroller}>
          <div className={styles.messageColumnPage}>
            {model.contributions.map((item, itemIndex) => renderMessageCard(item, itemIndex, profile.maxChars))}
          </div>
        </div>
        {renderMediaRail(model)}
      </div>
    );
  }

  const scrollerClassName =
    model.messageLayoutMode === "grid-2"
      ? styles.messageTrackGrid2
      : model.messageLayoutMode === "carousel-2"
        ? styles.messageTrackRows2
        : styles.messageTrackRow1;

  return (
    <div className={styles.messagesStage}>
      <div className={scrollerClassName}>
        {model.contributions.map((item, itemIndex) => renderMessageCard(item, itemIndex, profile.maxChars))}
      </div>
    </div>
  );
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

                  {renderHeroAside(model)}
                </section>
              );
            }

            if (block.id === "summary") {
              return (
                <section key={block.id} className={`${styles.summary} ${styles.section} ${styles.summaryPanel}`}>
                  <h2 className={styles.sectionTitle}>{model.summaryTitle}</h2>
                  <p className={styles.sectionText}>{model.summaryText}</p>
                </section>
              );
            }

            if (block.id === "qualities") {
              return (
                <section key={block.id} className={`${styles.qualities} ${styles.section} ${styles.qualitiesPanel}`}>
                  <h2 className={styles.sectionTitle}>Какая ты для нас</h2>
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
                    <h2 className={styles.sectionTitle}>Поздравления</h2>
                    <span className={styles.sectionBadge}>{model.contributions.length} сообщений</span>
                  </div>

                  {renderMessagesLayout(model)}

                  {model.showAllMessagesLink ? (
                    <div className={styles.sectionFooter}>
                      <Link href={`/gift/${model.finalSlug}/messages`} className={styles.inlineLinkButton}>
                        Смотреть все поздравления
                      </Link>
                    </div>
                  ) : null}
                </section>
              );
            }

            if (block.id === "memories") {
              const memoryAssets = model.memoryMediaAssets;

              return (
                <section key={block.id} className={`${styles.memories} ${styles.section}`}>
                  <h2 className={styles.sectionTitle}>Наши воспоминания</h2>
                  <div className={styles.memoriesStrip}>
                    <article className={styles.memoryIntroCard}>
                      <span className={styles.memoryIntroIcon}>♡</span>
                      <h2 className={styles.sectionTitle}>{model.memoryTitle}</h2>
                      <p className={styles.sectionText}>{model.memoryDescription}</p>
                    </article>
                    {memoryAssets.length > 0
                      ? memoryAssets.map((asset, index) => (
                          <article
                            key={asset.id}
                            className={`${styles.memoryPhotoCard} ${
                              index % 2 === 0 ? styles.memoryCardTilt : styles.memoryCardTiltAlt
                            }`}
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={asset.publicUrl}
                              alt={asset.captionTitle || asset.captionSubtitle || "Фото открытки"}
                              className={styles.memoryPhotoImage}
                            />
                            <div className={styles.memoryPhotoCaptionWrap}>
                              {asset.captionTitle ? (
                                <strong className={styles.memoryPhotoCaptionTitle}>{asset.captionTitle}</strong>
                              ) : null}
                              <p className={styles.memoryPhotoCaption}>
                                {asset.captionSubtitle || asset.captionTitle || "Фото для открытки"}
                              </p>
                            </div>
                          </article>
                        ))
                      : model.memories.map((item, index) => (
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
                  <h2 className={styles.sectionTitle}>Лучшие фразы</h2>
                  <div className={`${styles.grid} ${styles.quotesGrid}`}>
                    {model.quotes.map((quote) => (
                      <article key={quote} className={styles.quoteCard}>
                        <span className={styles.quoteMark}>&quot;</span>
                        <p className={styles.message}>{quote}</p>
                      </article>
                    ))}
                  </div>
                </section>
              );
            }

            if (block.id === "ai-summary") {
              return (
                <section key={block.id} className={`${styles.summary} ${styles.section} ${styles.aiSummaryPanel}`}>
                  <h2 className={styles.sectionTitle}>{model.aiSummaryTitle}</h2>
                  <p className={styles.sectionText}>{model.aiSummaryText}</p>
                </section>
              );
            }

            if (block.id === "closing") {
              return (
                <section key={block.id} className={styles.closing}>
                  <div className={styles.closingContent}>
                    <h2 className={styles.sectionTitle}>Спасибо, что вы вместе</h2>
                    <p className={styles.sectionText}>
                      Это уже не просто список сообщений, а собранный цифровой подарок. Дальше мы будем усиливать
                      медиа, публикацию и сам эффект вручения.
                    </p>
                  </div>
                  <div className={styles.actions}>
                    <button type="button" className={styles.primaryButton}>
                      Сохранить как память
                    </button>
                    <button type="button" className={styles.secondaryButton}>
                      Собрать похожую открытку
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
