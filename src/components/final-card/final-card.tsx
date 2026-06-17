import Link from "next/link";
import type { CardMediaAsset, Contribution } from "@/lib/cards/types";
import { getFinalCardMessageLayoutProfile } from "@/lib/final-card/message-layout-rules";
import type { FinalCardViewModel } from "@/lib/final-card/view-model";
import type { ScrapbookDecorAnchor } from "./scrapbook-decor-config";
import {
  ScrapbookDecorDebugPanel,
  ScrapbookDecorLayer,
  ScrapbookDecorProvider
} from "./scrapbook-decor-layer";
import styles from "./final-card.module.css";

type Props = {
  model: FinalCardViewModel;
  debugAssets?: boolean;
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
          "Р“РѕСЂРёР·РѕРЅС‚Р°Р»СЊРЅРѕРµ С„РѕС‚Рѕ A",
          "Р—РґРµСЃСЊ РјРѕР¶РµС‚ РїРѕСЏРІРёС‚СЊСЃСЏ РїРµСЂРІРѕРµ РіРѕСЂРёР·РѕРЅС‚Р°Р»СЊРЅРѕРµ С„РѕС‚Рѕ.",
          styles.mediaCardLandscape
        )}
        {renderMediaFigure(
          messageMediaAssets[1],
          "landscape-b",
          "Р“РѕСЂРёР·РѕРЅС‚Р°Р»СЊРЅРѕРµ С„РѕС‚Рѕ B",
          "Р—РґРµСЃСЊ РјРѕР¶РµС‚ РїРѕСЏРІРёС‚СЊСЃСЏ РІС‚РѕСЂРѕРµ РіРѕСЂРёР·РѕРЅС‚Р°Р»СЊРЅРѕРµ С„РѕС‚Рѕ.",
          styles.mediaCardLandscape
        )}
        {model.messageMediaLayout === "landscape-trio"
          ? renderMediaFigure(
              messageMediaAssets[2],
              "landscape-c",
              "Р“РѕСЂРёР·РѕРЅС‚Р°Р»СЊРЅРѕРµ С„РѕС‚Рѕ C",
              "Р—РґРµСЃСЊ РјРѕР¶РµС‚ РїРѕСЏРІРёС‚СЊСЃСЏ С‚СЂРµС‚СЊРµ РіРѕСЂРёР·РѕРЅС‚Р°Р»СЊРЅРѕРµ С„РѕС‚Рѕ.",
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
        "Р’РµСЂС‚РёРєР°Р»СЊРЅРѕРµ С„РѕС‚Рѕ",
        "Р—РґРµСЃСЊ РїСЂРµРґСѓСЃРјРѕС‚СЂРµРЅРѕ РјРµСЃС‚Рѕ РїРѕРґ РѕРґРЅРѕ Р·Р°РјРµС‚РЅРѕРµ РІРµСЂС‚РёРєР°Р»СЊРЅРѕРµ С„РѕС‚Рѕ.",
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

export const FinalCard = ({ model, debugAssets = false }: Props) => {
  const isPaperBirthday = model.style === "paper-birthday";
  const heroScaleClass = isPaperBirthday ? getPaperBirthdayHeroScaleClass(model.recipientName) : "";

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
          <span className={`${styles.paperDecor} ${styles.stickyNoteToday}`}>РЎРµРіРѕРґРЅСЏ С‚РІРѕР№ РґРµРЅСЊ!</span>
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
          return (
            <section
              key={block.id}
              className={`${styles.hero} ${heroScaleClass} ${isPaperBirthday ? styles.decorAnchor : ""}`.trim()}
            >
              {renderAnchorLayer("hero")}
              <div className={styles.heroGlow} />
              <div className={styles.heroMain}>
                <h1 className={styles.title}>
                  <span className={styles.heroNameLine}>{model.recipientName},</span>
                  <span className={styles.heroOccasionLine}>{model.occasionLabel}!</span>
                </h1>
                <p className={styles.subtitle}>
                  Р­С‚Сѓ РѕС‚РєСЂС‹С‚РєСѓ РґР»СЏ С‚РµР±СЏ СЃРѕР±СЂР°Р»Рё <strong>{model.fromLabel}</strong>. Р—РґРµСЃСЊ СѓР¶Рµ
                  Р¶РёРІСѓС‚ С‚РµРїР»С‹Рµ СЃР»РѕРІР°, РІР°Р¶РЅС‹Рµ РІРѕСЃРїРѕРјРёРЅР°РЅРёСЏ Рё Р°С‚РјРѕСЃС„РµСЂР° РѕР±С‰РµРіРѕ
                  РїРѕРґР°СЂРєР°.
                </p>
                <div className={styles.heroCtaRow}>
                  <span className={styles.heroParticipants}>
                    <span className={styles.heroParticipantsIcon}>рџ‘Ґ</span>
                    <strong>{model.participantCount} С‡РµР»РѕРІРµРє</strong>
                    <span>РѕСЃС‚Р°РІРёР»Рё РґР»СЏ С‚РµР±СЏ РїРѕР·РґСЂР°РІР»РµРЅРёСЏ</span>
                  </span>
                  <a href="#messages" className={`${styles.button} ${styles.primaryButton} ${styles.heroOpenButton}`}>
                    <span aria-hidden="true">рџ’Њ</span>
                    РћС‚РєСЂС‹С‚СЊ РїРѕР·РґСЂР°РІР»РµРЅРёСЏ
                  </a>
                </div>
              </div>
            </section>
          );
        }

        if (block.id === "summary") {
          return (
            <section
              key={block.id}
              className={`${styles.summary} ${styles.section} ${styles.summaryPanel} ${
                isPaperBirthday ? styles.decorAnchor : ""
              }`}
            >
              {renderAnchorLayer("summary")}
              <h2 className={styles.sectionTitle}>{model.summaryTitle}</h2>
              <p className={styles.sectionText}>{model.summaryText}</p>
            </section>
          );
        }

        if (block.id === "qualities") {
          return (
            <section
              key={block.id}
              className={`${styles.qualities} ${styles.section} ${styles.qualitiesPanel} ${
                isPaperBirthday ? styles.decorAnchor : ""
              }`}
            >
              {renderAnchorLayer("qualities")}
              <h2 className={styles.sectionTitle}>РљР°РєР°СЏ С‚С‹ РґР»СЏ РЅР°СЃ</h2>
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
            <section
              id="messages"
              key={block.id}
              className={`${styles.messages} ${styles.section} ${isPaperBirthday ? styles.decorAnchor : ""}`}
            >
              {renderAnchorLayer("greetings")}
              <div className={styles.sectionHeader}>
                <h2 className={styles.sectionTitle}>РџРѕР·РґСЂР°РІР»РµРЅРёСЏ</h2>
                <span className={styles.sectionBadge}>{model.contributions.length} СЃРѕРѕР±С‰РµРЅРёР№</span>
              </div>

              {renderMessagesLayout(model)}

              {model.showAllMessagesLink ? (
                <div className={styles.sectionFooter}>
                  <Link href={`/gift/${model.finalSlug}/messages`} className={styles.inlineLinkButton}>
                    РЎРјРѕС‚СЂРµС‚СЊ РІСЃРµ РїРѕР·РґСЂР°РІР»РµРЅРёСЏ
                  </Link>
                </div>
              ) : null}
            </section>
          );
        }

        if (block.id === "memories") {
          const memoryAssets = model.memoryMediaAssets;

          return (
            <section
              key={block.id}
              className={`${styles.memories} ${styles.section} ${isPaperBirthday ? styles.decorAnchor : ""}`}
            >
              {renderAnchorLayer("memories")}
              <h2 className={styles.sectionTitle}>РќР°С€Рё РІРѕСЃРїРѕРјРёРЅР°РЅРёСЏ</h2>
              <div className={styles.memoriesStrip}>
                <article className={styles.memoryIntroCard}>
                  <span className={styles.memoryIntroIcon}>в™Ў</span>
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
                          alt={asset.captionTitle || asset.captionSubtitle || "Р¤РѕС‚Рѕ РѕС‚РєСЂС‹С‚РєРё"}
                          className={styles.memoryPhotoImage}
                        />
                        <div className={styles.memoryPhotoCaptionWrap}>
                          {asset.captionTitle ? (
                            <strong className={styles.memoryPhotoCaptionTitle}>{asset.captionTitle}</strong>
                          ) : null}
                          <p className={styles.memoryPhotoCaption}>
                            {asset.captionSubtitle || asset.captionTitle || "Р¤РѕС‚Рѕ РґР»СЏ РѕС‚РєСЂС‹С‚РєРё"}
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
            <section
              key={block.id}
              className={`${styles.quotes} ${styles.section} ${isPaperBirthday ? styles.decorAnchor : ""}`}
            >
              {renderAnchorLayer("bestPhrases")}
              <h2 className={styles.sectionTitle}>Р›СѓС‡С€РёРµ С„СЂР°Р·С‹</h2>
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
            <section
              key={block.id}
              className={`${styles.summary} ${styles.section} ${styles.aiSummaryPanel} ${
                isPaperBirthday ? styles.decorAnchor : ""
              }`}
            >
              {renderAnchorLayer("bestPhrases")}
              <h2 className={styles.sectionTitle}>{model.aiSummaryTitle}</h2>
              <p className={styles.sectionText}>{model.aiSummaryText}</p>
            </section>
          );
        }

        if (block.id === "closing") {
          return (
            <section key={block.id} className={`${styles.closing} ${isPaperBirthday ? styles.decorAnchor : ""}`}>
              {renderAnchorLayer("footer")}
              <div className={styles.closingContent}>
                <h2 className={styles.sectionTitle}>РЎРїР°СЃРёР±Рѕ, С‡С‚Рѕ РІС‹ РІРјРµСЃС‚Рµ</h2>
                <p className={styles.sectionText}>
                  Р­С‚Рѕ СѓР¶Рµ РЅРµ РїСЂРѕСЃС‚Рѕ СЃРїРёСЃРѕРє СЃРѕРѕР±С‰РµРЅРёР№, Р° СЃРѕР±СЂР°РЅРЅС‹Р№ С†РёС„СЂРѕРІРѕР№
                  РїРѕРґР°СЂРѕРє. Р”Р°Р»СЊС€Рµ РјС‹ Р±СѓРґРµРј СѓСЃРёР»РёРІР°С‚СЊ РјРµРґРёР°, РїСѓР±Р»РёРєР°С†РёСЋ Рё
                  СЃР°Рј СЌС„С„РµРєС‚ РІСЂСѓС‡РµРЅРёСЏ.
                </p>
              </div>
              <div className={styles.actions}>
                <button type="button" className={styles.primaryButton}>
                  РЎРѕС…СЂР°РЅРёС‚СЊ РєР°Рє РїР°РјСЏС‚СЊ
                </button>
                <button type="button" className={styles.secondaryButton}>
                  РЎРѕР±СЂР°С‚СЊ РїРѕС…РѕР¶СѓСЋ РѕС‚РєСЂС‹С‚РєСѓ
                </button>
              </div>
            </section>
          );
        }

        return null;
      })}

      {isPaperBirthday ? <ScrapbookDecorDebugPanel /> : null}
    </>
  );

  return (
    <main className={`${styles.page} ${styleClassMap[model.style]}`}>
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
