import Link from "next/link";
import type { FinalCardViewModel } from "@/lib/final-card/view-model";
import { getGiftPath } from "@/lib/routes/card-links";
import { FinalCardActions } from "@/components/final-card/final-card-actions";
import { MessagesSection } from "@/components/final-card/messages-section";
import { RouteGreetingsCountButton } from "@/components/final-card/route-greetings-count-button";
import type { ScrapbookDecorAnchor } from "./scrapbook-decor-config";
import {
  ScrapbookComponentFrame,
  ScrapbookDecorDebugPanel,
  ScrapbookDecorLayer,
  ScrapbookDecorProvider
} from "./scrapbook-decor-layer";
import styles from "./final-card.module.css";

type Props = {
  model: FinalCardViewModel;
  debugAssets?: boolean;
  mode?: "gift" | "preview";
  manageToken?: string;
};

const styleClassMap = {
  "warm-classic": styles["warm-classic"],
  "team-modern": styles["team-modern"],
  "bright-celebration": styles["bright-celebration"],
  "gentle-personal": styles["gentle-personal"],
  "paper-birthday": styles["paper-birthday"],
  "route-adventure": styles["route-adventure"]
};

const getParticipantSummary = (count: number) => {
  const lastTwo = count % 100;
  const last = count % 10;

  if (lastTwo >= 11 && lastTwo <= 14) {
    return { people: `${count} человек`, action: "оставили поздравления" };
  }

  if (last === 1) {
    return { people: `${count} человек`, action: "оставил поздравление" };
  }

  if (last >= 2 && last <= 4) {
    return { people: `${count} человека`, action: "оставили поздравления" };
  }

  return { people: `${count} человек`, action: "оставили поздравления" };
};

const getPaperBirthdayHeroScaleClass = (recipientName: string) => {
  const words = recipientName
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  const longestWord = words.reduce((max, word) => Math.max(max, word.length), 0);

  if (words.length <= 1 && longestWord <= 10) {
    return styles.paperBirthdayHeroCompact;
  }

  if (words.length >= 2 || recipientName.length >= 16 || longestWord >= 12) {
    return styles.paperBirthdayHeroExpanded;
  }

  return "";
};

const PeopleIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <circle cx="9" cy="8" r="3.5" stroke="currentColor" strokeWidth="1.6" />
    <circle cx="17" cy="9" r="2.8" stroke="currentColor" strokeWidth="1.6" />
    <path
      d="M3 19c0-2.8 2.5-5 6-5s6 2.2 6 5"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
    />
    <path
      d="M15 17.5c0-2.2 1.8-4 4-4s4 1.8 4 4"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
    />
  </svg>
);

const HeartEnvelopeIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path
      d="M20 6.5l-8 6.5-8-6.5"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M4 6.5h16v11H4z"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinejoin="round"
    />
    <path
      d="M12 12.7l2.2-2.5a1.6 1.6 0 012.3 2.2L12 17l-4.5-4.6a1.6 1.6 0 012.3-2.2l2.2 2.5z"
      fill="currentColor"
    />
  </svg>
);

const HeartIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
  </svg>
);

const QualityIcon = ({ index }: { index: number }) => {
  const common = { fill: "none", stroke: "currentColor", strokeWidth: "1.7", strokeLinecap: "round" as const, strokeLinejoin: "round" as const };

  if (index === 0) return <svg viewBox="0 0 24 24" aria-hidden="true"><path {...common} d="M12 3l7 3v5c0 4.2-2.8 7.9-7 9.8C7.8 18.9 5 15.2 5 11V6l7-3z" /><path {...common} d="M9 12l2 2 4-4" /></svg>;
  if (index === 1) return <svg viewBox="0 0 24 24" aria-hidden="true"><path {...common} d="M20.8 8.1c0 5.5-8.8 10.2-8.8 10.2S3.2 13.6 3.2 8.1A4.3 4.3 0 0112 5.6a4.3 4.3 0 018.8 2.5z" /></svg>;
  if (index === 2) return <svg viewBox="0 0 24 24" aria-hidden="true"><path {...common} d="M3 19l6.2-9 3 4.4L15.6 9 21 19" /><path {...common} d="M7.8 19l3.5-5.2L14 19" /></svg>;
  if (index === 3) return <svg viewBox="0 0 24 24" aria-hidden="true"><circle {...common} cx="8" cy="9" r="3" /><circle {...common} cx="17" cy="10" r="2.4" /><path {...common} d="M3 20c0-3.3 2.2-5.4 5-5.4s5 2.1 5 5.4M14 19.8c0-2.6 1.6-4.3 4-4.3 1.5 0 2.5.6 3 1.4" /></svg>;
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path {...common} d="M12 3l1.7 5.3H19l-4.3 3.1 1.6 5.3-4.3-3.1-4.3 3.1 1.6-5.3L5 8.3h5.3L12 3z" /></svg>;
};

const SparkleIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M12 2l2.4 7.2h7.6l-6 4.8 2.4 7.2-6-4.8-6 4.8 2.4-7.2-6-4.8h7.6z" />
  </svg>
);

const DownloadIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path d="M12 15V3m0 12l-4-4m4 4l4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M2 17l.621 2.485A2 2 0 004.561 21h14.878a2 2 0 001.94-1.515L22 17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const getQualityAssetId = (index: number) => {
  const cycle = ["qualityCardPink", "qualityCardViolet", "qualityCardBeige", "qualityCardGreen", "qualityCardBlue"] as const;
  return cycle[index % cycle.length];
};

const getQuoteAssetId = (index: number) => {
  const cycle = ["quoteCardPink", "quoteCardBeige", "quoteCardBlue"] as const;
  return cycle[index % cycle.length];
};

export const FinalCard = ({ model, debugAssets = false, mode = "gift", manageToken }: Props) => {
  const isPreview = mode === "preview";
  const isPaperBirthday = model.style === "paper-birthday";
  const isRouteAdventure = model.style === "route-adventure";
  const participantSummary = getParticipantSummary(model.participantCount);
  const heroScaleClass = isPaperBirthday ? getPaperBirthdayHeroScaleClass(model.recipientName) : "";
  const heroNameWords = model.recipientName
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  const heroNameContent =
    isPaperBirthday && heroNameWords.length > 1
      ? heroNameWords.map((word, index) => (
          <span key={`${word}-${index}`} className={styles.heroNameWord}>
            {word}
          </span>
        ))
      : model.recipientName;

  const renderAnchorLayer = (anchor: ScrapbookDecorAnchor) =>
    isPaperBirthday ? <ScrapbookDecorLayer anchor={anchor} /> : null;

  const content = (
    <>
      {isPaperBirthday ? (
        <ScrapbookDecorLayer anchor="templateRoot" />
      ) : (
        <div className={styles.paperDecorLayer} aria-hidden="true">
          <span className={`${styles.paperDecor} ${styles.confettiTop}`} />
          <span className={`${styles.paperDecor} ${styles.heartStickerTopLeft}`} />
          <span className={`${styles.paperDecor} ${styles.polaroidCakeLeft}`} />
          <span className={`${styles.paperDecor} ${styles.goldHeartLeft}`} />
          <span className={`${styles.paperDecor} ${styles.polaroidFlowersTopRight}`} />
          <span className={`${styles.paperDecor} ${styles.stickyNoteToday}`}>Сегодня твой день!</span>
          <span className={`${styles.paperDecor} ${styles.watercolorStainPink}`} />
          <span className={`${styles.paperDecor} ${styles.watercolorStainBeige}`} />
          <span className={`${styles.paperDecor} ${styles.rightConfettiScatter}`} />
          <span className={`${styles.paperDecor} ${styles.driedFlowersRight}`} />
          <span className={`${styles.paperDecor} ${styles.pinkHeartMidRight}`} />
          <span className={`${styles.paperDecor} ${styles.goldHeartBottomRight}`} />
          <span className={`${styles.paperDecor} ${styles.driedFlowersBottomLeft}`} />
          <span className={`${styles.paperDecor} ${styles.footerFloralCluster}`} />
        </div>
      )}

      {model.blocks.map((block) => {
        if (block.id === "hero") {
          const heroBody = (
            <>
              {renderAnchorLayer("hero")}
              <div className={styles.heroGlow} />
              {isPreview ? (
                <div className={styles.previewAnimationNote}>
                  <span className={styles.previewAnimationIcon} aria-hidden="true">
                    <HeartEnvelopeIcon />
                  </span>
                  <div>
                    <strong>Анимация открытия: Конверт с открыткой</strong>
                    <span>Будет доступна получателю после публикации.</span>
                  </div>
                </div>
              ) : null}
              <div className={styles.heroMain}>
                <div className={styles.heroPretitle}>{model.occasionLabel}</div>
                <h1 className={styles.title}>
                  <span className={styles.heroNameLine}>{heroNameContent}</span>
                </h1>
                <p className={styles.subtitle}>
                  {model.heroDescription ? (
                    <span>{model.heroDescription}</span>
                  ) : isRouteAdventure ? (
                    <span>В этой открытке — тёплые слова, важные моменты и личные пожелания.</span>
                  ) : (
                    <>
                      <span>Эту открытку для тебя собрали близкие люди.</span>
                      {" "}
                      <span>Здесь — теплые слова, фотографии и приятные моменты.</span>
                    </>
                  )}
                </p>
                <div className={styles.heroCtaRow}>
                  <span className={styles.heroParticipants}>
                    <span className={styles.heroParticipantsIcon}>
                      <PeopleIcon />
                    </span>
                    <strong>{participantSummary.people}</strong>
                    <span>{participantSummary.action}</span>
                  </span>
                  <a href="#messages" className={`${styles.button} ${styles.primaryButton} ${styles.heroOpenButton}`}>
                    <span aria-hidden="true">
                      <HeartEnvelopeIcon />
                    </span>
                    Открыть поздравления
                  </a>
                </div>
              </div>
            </>
          );

          return isPaperBirthday ? (
            <ScrapbookComponentFrame
              key={block.id}
              as="section"
              assetId="heroPaper"
              className={`${styles.hero} ${heroScaleClass} ${styles.decorAnchor}`.trim()}
            >
              {heroBody}
            </ScrapbookComponentFrame>
          ) : (
            <section key={block.id} className={`${styles.hero} ${heroScaleClass}`.trim()}>
              {heroBody}
            </section>
          );
        }

        if (block.id === "summary") {
          const summaryBody = (
            <>
              <h2 className={styles.sectionTitle}>{model.summaryTitle}</h2>
              {model.summaryText.split(/\n{2,}/).map((paragraph, index) => (
                <p key={`${paragraph.slice(0, 24)}-${index}`} className={styles.sectionText}>
                  {paragraph}
                </p>
              ))}
              {isRouteAdventure || model.mainGreetingAuthorName ? (
                <p className={styles.summaryAuthor}>- {model.mainGreetingAuthorName ?? model.contributions[0]?.authorName ?? "друзья"}</p>
              ) : null}
            </>
          );
          const summaryContent = (
            <>
              {renderAnchorLayer("summary")}
              {isRouteAdventure ? <div className={styles.routeSummaryBackdrop}>{summaryBody}</div> : summaryBody}
            </>
          );

          return isPaperBirthday ? (
            <ScrapbookComponentFrame
              key={block.id}
              as="section"
              assetId="summaryPaper"
              className={`${styles.summary} ${styles.section} ${styles.summaryPanel} ${styles.decorAnchor}`}
            >
              {summaryContent}
            </ScrapbookComponentFrame>
          ) : (
            <section key={block.id} className={`${styles.summary} ${styles.section} ${styles.summaryPanel}`}>
              {summaryContent}
            </section>
          );
        }

        if (block.id === "qualities") {
          const chipColors = ["rose", "blue", "amber", "green", "violet", "teal"];
          const visibleQualities = model.qualities.slice(0, 5);

          const qualitiesBody = (
            <>
              <h2 className={styles.sectionTitle}>За что тебя ценят</h2>
              <p className={styles.sectionSubtitle}>Собрано из поздравлений</p>
              <div className={styles.chipList}>
                {visibleQualities.map((quality, index) => {
                  const color = chipColors[index % chipColors.length];
                  const qualityLengthClass = quality.length >= 14
                    ? styles.qualityChipLong
                    : quality.length >= 11
                      ? styles.qualityChipMedium
                      : "";
                  const chip = (
                    <span
                      key={quality}
                      className={`${styles.chip} ${styles[`chip${color.charAt(0).toUpperCase() + color.slice(1)}`]}`}
                    >
                      {isRouteAdventure ? <span className={styles.routeQualityIcon}><QualityIcon index={index} /></span> : null}
                      {quality}
                    </span>
                  );

                  return isPaperBirthday ? (
                    <ScrapbookComponentFrame
                      key={quality}
                      assetId={getQualityAssetId(index)}
                      className={[styles.qualityChipFrame, qualityLengthClass].filter(Boolean).join(" ")}
                    >
                      {chip}
                    </ScrapbookComponentFrame>
                  ) : (
                    chip
                  );
                })}
              </div>
            </>
          );
          const content = isRouteAdventure ? (
            <div className={styles.routeQualitiesBackdrop}>{qualitiesBody}</div>
          ) : (
            qualitiesBody
          );

          return isPaperBirthday ? (
            <ScrapbookComponentFrame
              key={block.id}
              as="section"
              assetId="qualitiesPaper"
              className={`${styles.qualities} ${styles.section} ${styles.qualitiesPanel} ${styles.decorAnchor}`}
            >
              {renderAnchorLayer("qualities")}
              {content}
            </ScrapbookComponentFrame>
          ) : (
            <section key={block.id} className={`${styles.qualities} ${styles.section} ${styles.qualitiesPanel}`}>
              {content}
            </section>
          );
        }

        if (block.id === "messages") {
          const messagesContent = (
            <>
              {renderAnchorLayer("greetings")}
              <div className={styles.sectionHeader}>
                <h2 className={styles.sectionTitle}>Поздравления</h2>
                {isRouteAdventure || isPaperBirthday ? <RouteGreetingsCountButton count={model.contributions.length} /> : <span className={styles.sectionBadge}>{model.contributions.length} поздравлений</span>}
              </div>

              {model.contributions.length === 0 ? (
                <p className={styles.sectionText}>Пока нет поздравлений. Скоро здесь появятся теплые слова от группы.</p>
              ) : (
                <MessagesSection
                  contributions={model.contributions}
                  messageLayoutMode={model.messageLayoutMode}
                  messageMediaAssets={model.messageMediaAssets}
                  messageMediaLayout={model.messageMediaLayout}
                  isPaperBirthday={isPaperBirthday}
                  isRouteAdventure={isRouteAdventure}
                />
              )}

              {!isPreview && !isPaperBirthday && !isRouteAdventure && model.showAllMessagesLink ? (
                <div className={styles.sectionFooter}>
                  <Link href={`${getGiftPath(model.finalSlug)}/messages`} className={styles.inlineLinkButton}>
                    Смотреть все поздравления
                  </Link>
                </div>
              ) : null}
            </>
          );

          return isPaperBirthday ? (
            <ScrapbookComponentFrame
              id="messages"
              key={block.id}
              as="section"
              assetId="messagesPaper"
              className={`${styles.messages} ${styles.section} ${styles.decorAnchor}`}
            >
              {messagesContent}
            </ScrapbookComponentFrame>
          ) : (
            <section id="messages" key={block.id} className={`${styles.messages} ${styles.section}`}>
              {messagesContent}
            </section>
          );
        }

        if (block.id === "memories") {
          const memoryAssets = model.memoryMediaAssets;

          const memoriesContent = (
            <>
              {renderAnchorLayer("memories")}
              <h2 className={styles.sectionTitle}>{model.memoryTitle}</h2>
              <div className={styles.memoriesStrip}>
                <article className={styles.memoryIntroCard}>
                  <span className={styles.memoryIntroIcon}>♡</span>
                  <h2 className={styles.sectionTitle}>{model.memoryTitle}</h2>
                  <p className={styles.sectionText}>{model.memoryDescription}</p>
                </article>
                {memoryAssets.length > 0
                  ? memoryAssets.map((asset, index) => {
                      const className = `${styles.memoryPhotoCard} ${
                        index % 2 === 0 ? styles.memoryCardTilt : styles.memoryCardTiltAlt
                      }`;
                      const content = (
                        <>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={asset.publicUrl}
                          alt={asset.captionTitle || asset.captionSubtitle || "Фото открытки"}
                          className={styles.memoryPhotoImage}
                        />
                        <div className={styles.memoryPhotoCaptionWrap}>
                          <p className={styles.memoryPhotoCaption}>
                            {asset.captionSubtitle || asset.captionTitle || "Фото для открытки"}
                          </p>
                        </div>
                        </>
                      );

                      return isPaperBirthday ? (
                        <ScrapbookComponentFrame
                          key={asset.id}
                          as="article"
                          assetId="memoryPolaroidFrame"
                          className={className}
                        >
                          {content}
                        </ScrapbookComponentFrame>
                      ) : (
                        <article key={asset.id} className={className}>
                          {content}
                        </article>
                      );
                    })
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
            </>
          );

          return isPaperBirthday ? (
            <ScrapbookComponentFrame
              key={block.id}
              as="section"
              assetId="memoriesPaper"
              className={`${styles.memories} ${styles.section} ${styles.decorAnchor}`}
            >
              {memoriesContent}
            </ScrapbookComponentFrame>
          ) : (
            <section key={block.id} className={`${styles.memories} ${styles.section}`}>
              {memoriesContent}
            </section>
          );
        }

        if (block.id === "quotes") {
          const content = (
            <>
              {renderAnchorLayer("bestPhrases")}
              <h2 className={styles.sectionTitle}>Лучшие фразы</h2>
              {model.quotes.length > 0 ? (
                <div className={`${styles.grid} ${styles.quotesGrid}`}>
                  {model.quotes.map((quote, index) =>
                    isPaperBirthday ? (
                      <ScrapbookComponentFrame
                        key={`${quote}-${index}`}
                        assetId={getQuoteAssetId(index)}
                        className={`${styles.quoteCard} ${styles.paperBirthdayQuoteFrame}`}
                      >
                        <span className={styles.quoteMark}>,,</span>
                        <p className={styles.message}>{quote}</p>
                      </ScrapbookComponentFrame>
                    ) : (
                      <article key={`${quote}-${index}`} className={styles.quoteCard}>
                        <span className={styles.quoteMark}>&quot;</span>
                        <p className={styles.message}>{quote}</p>
                      </article>
                    )
                  )}
                </div>
              ) : (
                <p className={`${styles.sectionText} ${styles.emptyQuotesText}`}>
                  Здесь появятся самые тёплые фразы из поздравлений. Пока их мало, открытка бережно сохранит это место.
                </p>
              )}
            </>
          );

          return isPaperBirthday ? (
            <ScrapbookComponentFrame
              key={block.id}
              as="section"
              assetId="quotesPaper"
              className={`${styles.quotes} ${styles.section} ${styles.decorAnchor}`}
            >
              {content}
            </ScrapbookComponentFrame>
          ) : (
            <section key={block.id} className={`${styles.quotes} ${styles.section}`}>
              {content}
            </section>
          );
        }

        if (block.id === "ai-summary") {
          const aiSummaryContent = (
            <>
              {renderAnchorLayer("bestPhrases")}
              <h2 className={styles.sectionTitle}>{model.aiSummaryTitle}</h2>
              <p className={styles.sectionText}>{model.aiSummaryText}</p>
            </>
          );

          return isPaperBirthday ? (
            <ScrapbookComponentFrame
              key={block.id}
              as="section"
              assetId="aiSummaryPaper"
              className={`${styles.summary} ${styles.section} ${styles.aiSummaryPanel} ${styles.decorAnchor}`}
            >
              {aiSummaryContent}
            </ScrapbookComponentFrame>
          ) : (
            <section key={block.id} className={`${styles.summary} ${styles.section} ${styles.aiSummaryPanel}`}>
              {aiSummaryContent}
            </section>
          );
        }

        if (block.id === "closing") {
          const closingContent = isPreview ? (
            <>
              {renderAnchorLayer("footer")}
              <div className={styles.previewClosing}>
                <p className={styles.previewClosingTitle}>Это предпросмотр</p>
                <p className={styles.previewClosingText}>
                  После публикации здесь будет финальная открытка без водяного знака, с анимацией
                  открытия и ссылкой для получателя.
                </p>
                {manageToken ? <p className={styles.previewClosingText}>Финальную ссылку можно открыть после оплаты и передачи получателю.</p> : null}
              </div>
            </>
          ) : (
            <>
              {renderAnchorLayer("footer")}
              <div className={styles.closingContent}>
                {isRouteAdventure ? (
                  <div className={styles.routeFooterSignature}>
                    <p className={styles.routeFooterLead}>{model.footerSignature.split(/\n{2,}/)[0]}</p>
                    <p className={styles.routeFooterSign}>{model.footerSignature.split(/\n{2,}/)[1] ?? "С теплом,\nдрузья"}</p>
                  </div>
                ) : (
                  <p className={styles.closingSignature}>{model.footerSignature}</p>
                )}
              </div>
              <FinalCardActions manageHref={manageToken ? `/manage/${manageToken}` : undefined} routeAdventure={isRouteAdventure} />
              {isRouteAdventure || isPaperBirthday ? (
                <>
                  <span className={styles.routeFooterTagLabel}>На память</span>
                  <p className={styles.routeBranding}>
                    <Link href="/">Создано в Slovesto</Link>
                    <span>Место, где слова становятся подарком</span>
                  </p>
                </>
              ) : null}
            </>
          );

          return isPaperBirthday ? (
            <ScrapbookComponentFrame
              key={block.id}
              as="section"
              assetId="closingPaper"
              className={`${styles.closing} ${styles.decorAnchor}`}
            >
              {closingContent}
            </ScrapbookComponentFrame>
          ) : (
            <section key={block.id} className={styles.closing}>
              {closingContent}
            </section>
          );
        }

        return null;
      })}

      {isPaperBirthday ? <ScrapbookDecorDebugPanel /> : null}
    </>
  );

  return (
    <main
      className={`${styles.page} ${styleClassMap[model.style]} ${
        isPaperBirthday && debugAssets ? styles.assetDebugActive : ""
      }`.trim()}
    >
      <div className={styles.shell}>
        <div className={`${styles.canvas} ${isPaperBirthday ? styles.decorAnchor : ""}`.trim()}>
          {isPaperBirthday ? (
            <ScrapbookDecorProvider debugEnabled={debugAssets}>{content}</ScrapbookDecorProvider>
          ) : (
            content
          )}
        </div>
      </div>
    </main>
  );
};
