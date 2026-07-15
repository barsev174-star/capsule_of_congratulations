"use client";

import { useState } from "react";
import type { CardMediaAsset, Contribution } from "@/lib/cards/types";
import type {
  FinalCardMessageLayoutMode,
  FinalCardMessageMediaLayout
} from "@/lib/final-card/types";
import { getFinalCardMessageLayoutProfile } from "@/lib/final-card/message-layout-rules";
import { ScrapbookComponentFrame } from "./scrapbook-decor-layer";
import finalCardStyles from "./final-card.module.css";
import styles from "./messages-section.module.css";

type Props = {
  contributions: Contribution[];
  messageLayoutMode: FinalCardMessageLayoutMode;
  messageMediaAssets: CardMediaAsset[];
  messageMediaLayout: FinalCardMessageMediaLayout;
  isPaperBirthday: boolean;
};

const INITIAL_VISIBLE_COUNT = 4;
const LOAD_MORE_STEP = 5;

const trimMessage = (message: string, maxChars: number) =>
  message.length > maxChars ? `${message.slice(0, maxChars - 1).trimEnd()}...` : message;

const getInitials = (name: string) =>
  name
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word[0])
    .join("")
    .toUpperCase();

const getGreetingAssetId = (index: number) => {
  const cycle = ["greetingCardPink", "greetingCardCream", "greetingCardBlue", "greetingCardLavender"] as const;
  return cycle[index % cycle.length];
};

const renderMessageCard = (
  item: Contribution,
  index: number,
  maxChars: number,
  isPaperBirthday: boolean,
  isHidden: boolean
) => {
  const className = `${finalCardStyles.card} ${isHidden ? finalCardStyles.cardHidden : ""} ${
    index === 0
      ? finalCardStyles.cardSpotlight
      : index % 3 === 0
        ? finalCardStyles.cardAccent
        : ""
  }`.trim();
  const content = (
    <>
      <div className={finalCardStyles.cardHeader}>
        <div className={finalCardStyles.authorAvatar}>
          {item.authorAvatarUrl ? (
            // User-provided local uploads keep their original URL and CSS crop behavior.
            // eslint-disable-next-line @next/next/no-img-element
            <img src={item.authorAvatarUrl} alt="" className={finalCardStyles.authorAvatarImage} />
          ) : (
            <span className={finalCardStyles.authorAvatarInitials}>{getInitials(item.authorName)}</span>
          )}
        </div>
        <div className={finalCardStyles.authorMeta}>
          <span className={finalCardStyles.author}>{item.authorName}</span>
          {item.authorRole ? <span className={finalCardStyles.role}>{item.authorRole}</span> : null}
        </div>
      </div>
      <p className={finalCardStyles.message}>{trimMessage(item.message, maxChars)}</p>
    </>
  );

  return isPaperBirthday ? (
    <ScrapbookComponentFrame key={item.id} as="article" assetId={getGreetingAssetId(index)} className={className}>
      {content}
    </ScrapbookComponentFrame>
  ) : (
    <article key={item.id} className={className}>
      {content}
    </article>
  );
};

const renderMediaFigure = (
  asset: CardMediaAsset | undefined,
  slot: CardMediaAsset["slot"],
  title: string,
  fallbackText: string,
  className: string,
  isPaperBirthday: boolean
) => {
  const frameClassName =
    slot === "portrait"
      ? `${className} ${finalCardStyles.mediaFrameTiltLeft}`
      : slot === "landscape-b"
        ? `${className} ${finalCardStyles.mediaFrameTiltRight}`
        : `${className} ${finalCardStyles.mediaFrameTiltLeft}`;

  const content = (
    <>
      {asset ? (
        <>
          {slot === "portrait" && isPaperBirthday ? (
            <span className={finalCardStyles.mediaPortraitViewport}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={asset.publicUrl}
                alt={asset.captionTitle || asset.captionSubtitle || title}
                className={finalCardStyles.mediaImage}
              />
            </span>
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={asset.publicUrl}
              alt={asset.captionTitle || asset.captionSubtitle || title}
              className={finalCardStyles.mediaImage}
            />
          )}
          <figcaption className={finalCardStyles.mediaCaption}>
            <span className={finalCardStyles.mediaCaptionSubtitle}>
              {asset.captionTitle || asset.captionSubtitle || title}
            </span>
          </figcaption>
        </>
      ) : (
        <>
          <span className={finalCardStyles.mediaLabel}>{title}</span>
          <p className={finalCardStyles.mediaHint}>{fallbackText}</p>
        </>
      )}
    </>
  );

  if (!isPaperBirthday) {
    return <figure className={frameClassName}>{content}</figure>;
  }

  return (
    <ScrapbookComponentFrame
      as="figure"
      assetId={slot === "portrait" ? "messagePolaroidPortrait" : "messagePolaroidLandscape"}
      className={frameClassName}
    >
      {content}
    </ScrapbookComponentFrame>
  );
};

const renderMediaRail = (
  messageMediaAssets: CardMediaAsset[],
  messageMediaLayout: FinalCardMessageMediaLayout,
  isPaperBirthday: boolean
) => {
  if (messageMediaLayout === "landscape-pair" || messageMediaLayout === "landscape-trio") {
    return (
      <div
        className={`${finalCardStyles.mediaRail} ${
          messageMediaLayout === "landscape-trio" ? finalCardStyles.mediaRailTrio : finalCardStyles.mediaRailPair
        }`}
      >
        {renderMediaFigure(
          messageMediaAssets[0],
          "landscape-a",
          "Горизонтальное фото A",
          "Здесь может появиться первое горизонтальное фото.",
          finalCardStyles.mediaCardLandscape,
          isPaperBirthday
        )}
        {renderMediaFigure(
          messageMediaAssets[1],
          "landscape-b",
          "Горизонтальное фото B",
          "Здесь может появиться второе горизонтальное фото.",
          finalCardStyles.mediaCardLandscape,
          isPaperBirthday
        )}
        {messageMediaLayout === "landscape-trio"
          ? renderMediaFigure(
              messageMediaAssets[2],
              "landscape-c",
              "Горизонтальное фото C",
              "Здесь может появиться третье горизонтальное фото.",
              finalCardStyles.mediaCardLandscape,
              isPaperBirthday
            )
          : null}
      </div>
    );
  }

  return (
    <div className={finalCardStyles.mediaRail}>
      {renderMediaFigure(
        messageMediaAssets[0],
        "portrait",
        "Вертикальное фото",
        "Здесь предусмотрено место под одно заметное вертикальное фото.",
        finalCardStyles.mediaCardPortrait,
        isPaperBirthday
      )}
    </div>
  );
};

export const MessagesSection = ({
  contributions,
  messageLayoutMode,
  messageMediaAssets,
  messageMediaLayout,
  isPaperBirthday
}: Props) => {
  const [visibleCount, setVisibleCount] = useState(INITIAL_VISIBLE_COUNT);
  const profile = getFinalCardMessageLayoutProfile(messageLayoutMode);
  const isColumnMedia = profile.pageVariant === "column-media";
  const remaining = contributions.length - visibleCount;
  const hasMore = remaining > 0;

  const handleLoadMore = () => {
    setVisibleCount((previous) => Math.min(previous + LOAD_MORE_STEP, contributions.length));
  };

  const loadMoreButton = hasMore ? (
    <div className={styles.loadMoreWrap}>
      <button type="button" className={styles.loadMoreButton} onClick={handleLoadMore}>
        {remaining >= LOAD_MORE_STEP
          ? `Показать ещё ${LOAD_MORE_STEP} поздравлений`
          : `Показать ещё ${remaining} поздравлений`}
      </button>
      <span className={styles.loadMoreCounter}>
        Показано {Math.min(visibleCount, contributions.length)} из {contributions.length}
      </span>
    </div>
  ) : null;

  if (isColumnMedia) {
    return (
      <div className={finalCardStyles.messageSplitFixed}>
        <div className={finalCardStyles.messageColumnScroller}>
          <div className={finalCardStyles.messageColumnPage}>
            {contributions.map((item, index) =>
              renderMessageCard(item, index, profile.maxChars, isPaperBirthday, index >= visibleCount)
            )}
          </div>
          {loadMoreButton}
        </div>
        {renderMediaRail(messageMediaAssets, messageMediaLayout, isPaperBirthday)}
      </div>
    );
  }

  const scrollerClassName =
    messageLayoutMode === "grid-2"
      ? finalCardStyles.messageTrackGrid2
      : messageLayoutMode === "carousel-2"
        ? finalCardStyles.messageTrackRows2
        : finalCardStyles.messageTrackRow1;

  return (
    <div className={finalCardStyles.messagesStage}>
      <div className={scrollerClassName}>
        {contributions.map((item, index) =>
          renderMessageCard(item, index, profile.maxChars, isPaperBirthday, index >= visibleCount)
        )}
      </div>
      {loadMoreButton}
    </div>
  );
};
