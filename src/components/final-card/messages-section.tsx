"use client";

import { useEffect, useRef, useState } from "react";
import type { CardMediaAsset, Contribution } from "@/lib/cards/types";
import type {
  FinalCardMessageLayoutMode,
  FinalCardMessageMediaLayout
} from "@/lib/final-card/types";
import { getFinalCardMessageLayoutProfile } from "@/lib/final-card/message-layout-rules";
import { pluralize } from "@/lib/i18n/pluralize";
import { ScrapbookComponentFrame } from "./scrapbook-decor-layer";
import finalCardStyles from "./final-card.module.css";
import styles from "./messages-section.module.css";

type Props = {
  contributions: Contribution[];
  messageLayoutMode: FinalCardMessageLayoutMode;
  messageMediaAssets: CardMediaAsset[];
  messageMediaLayout: FinalCardMessageMediaLayout;
  isPaperBirthday: boolean;
  isRouteAdventure?: boolean;
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

const getRouteGreetingCountLabel = (count: number) =>
  `${count} ${pluralize(count, { one: "\u043f\u043e\u0437\u0434\u0440\u0430\u0432\u043b\u0435\u043d\u0438\u0435", few: "\u043f\u043e\u0437\u0434\u0440\u0430\u0432\u043b\u0435\u043d\u0438\u044f", many: "\u043f\u043e\u0437\u0434\u0440\u0430\u0432\u043b\u0435\u043d\u0438\u0439" })}`;

const getRouteMessageCountLabel = (count: number) =>
  `${count} ${pluralize(count, { one: "\u0441\u043e\u043e\u0431\u0449\u0435\u043d\u0438\u0435", few: "\u0441\u043e\u043e\u0431\u0449\u0435\u043d\u0438\u044f", many: "\u0441\u043e\u043e\u0431\u0449\u0435\u043d\u0438\u0439" })}`;

const renderMessageCard = (
  item: Contribution,
  index: number,
  maxChars: number,
  isPaperBirthday: boolean,
  isRouteAdventure: boolean,
  isHidden: boolean,
  isRouteMobileOverflow = false
) => {
  const className = `${finalCardStyles.card} ${isHidden ? finalCardStyles.cardHidden : ""} ${
    isRouteMobileOverflow ? styles.routeMobileOverflowCard : ""
  } ${
    index === 0
      ? finalCardStyles.cardSpotlight
      : index % 3 === 0
        ? finalCardStyles.cardAccent
        : ""
  }`.trim();
  const content = (
    <>
      <div className={finalCardStyles.cardHeader}>
        {!isRouteAdventure ? <div className={finalCardStyles.authorAvatar}>
          {item.authorAvatarUrl ? (
            // User-provided local uploads keep their original URL and CSS crop behavior.
            // eslint-disable-next-line @next/next/no-img-element
            <img src={item.authorAvatarUrl} alt="" className={finalCardStyles.authorAvatarImage} />
          ) : (
            <span className={finalCardStyles.authorAvatarInitials}>{getInitials(item.authorName)}</span>
          )}
        </div> : null}
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
  isPaperBirthday: boolean,
  isRouteAdventure: boolean
) => {
  const frameClassName =
    slot === "portrait"
      ? `${className} ${finalCardStyles.mediaFrameTiltLeft}`
      : slot === "landscape-b"
        ? `${className} ${finalCardStyles.mediaFrameTiltRight}`
        : `${className} ${finalCardStyles.mediaFrameTiltLeft}`;

  const usesRouteMomentFrame = isRouteAdventure && slot !== "portrait";
  const content = usesRouteMomentFrame ? (
    <>
      {asset ? (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={asset.publicUrl}
            alt={asset.captionTitle || asset.captionSubtitle || title}
            className={finalCardStyles.memoryPhotoImage}
          />
          <div className={finalCardStyles.memoryPhotoCaptionWrap}>
            <p className={finalCardStyles.memoryPhotoCaption}>
              {asset.captionTitle || asset.captionSubtitle || title}
            </p>
          </div>
        </>
      ) : (
        <>
          <span className={finalCardStyles.mediaLabel}>{title}</span>
          <p className={finalCardStyles.mediaHint}>{fallbackText}</p>
        </>
      )}
    </>
  ) : (
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

  if (usesRouteMomentFrame) {
    return <figure className={finalCardStyles.memoryPhotoCard}>{content}</figure>;
  }

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
  isPaperBirthday: boolean,
  isRouteAdventure: boolean
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
          isPaperBirthday,
          isRouteAdventure
        )}
        {renderMediaFigure(
          messageMediaAssets[1],
          "landscape-b",
          "Горизонтальное фото B",
          "Здесь может появиться второе горизонтальное фото.",
          finalCardStyles.mediaCardLandscape,
          isPaperBirthday,
          isRouteAdventure
        )}
        {messageMediaLayout === "landscape-trio"
          ? renderMediaFigure(
              messageMediaAssets[2],
              "landscape-c",
              "Горизонтальное фото C",
              "Здесь может появиться третье горизонтальное фото.",
              finalCardStyles.mediaCardLandscape,
              isPaperBirthday,
              isRouteAdventure
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
        isPaperBirthday,
        isRouteAdventure
      )}
    </div>
  );
};

export const MessagesSection = ({
  contributions,
  messageLayoutMode,
  messageMediaAssets,
  messageMediaLayout,
  isPaperBirthday,
  isRouteAdventure = false
}: Props) => {
  const [visibleCount, setVisibleCount] = useState(INITIAL_VISIBLE_COUNT);
  const [isAllGreetingsOpen, setIsAllGreetingsOpen] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const routeMobileShowAllButtonRef = useRef<HTMLButtonElement>(null);
  const dialogHistoryEntryRef = useRef(false);
  const dialogTriggerRef = useRef<"header" | "mobile">("header");
  const profile = getFinalCardMessageLayoutProfile(messageLayoutMode, messageMediaLayout);
  const isColumnMedia = profile.pageVariant === "column-media";
  const supportsGreetingsDialog = isRouteAdventure || isPaperBirthday;
  const routeVisibleCount = profile.cardsPerPage;
  const remaining = contributions.length - visibleCount;
  const hasMore = remaining > 0;

  const handleLoadMore = () => {
    setVisibleCount((previous) => Math.min(previous + LOAD_MORE_STEP, contributions.length));
  };

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (isAllGreetingsOpen) {
      if (!dialogHistoryEntryRef.current) {
        window.history.pushState({ routeAllGreetings: true }, "");
        dialogHistoryEntryRef.current = true;
      }
      dialog.showModal();
    } else if (dialog.open) {
      dialog.close();
    }
  }, [isAllGreetingsOpen]);

  useEffect(() => {
    const handlePopState = () => {
      if (!dialogHistoryEntryRef.current) return;
      dialogHistoryEntryRef.current = false;
      setIsAllGreetingsOpen(false);
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  useEffect(() => {
    const openFromHeader = (event: Event) => {
      if (supportsGreetingsDialog && contributions.length > 0) {
        dialogTriggerRef.current = (event as CustomEvent<{ source?: "header" | "mobile" }>).detail?.source ?? "header";
        setIsAllGreetingsOpen(true);
      }
    };
    window.addEventListener("route-greetings:open", openFromHeader);
    return () => window.removeEventListener("route-greetings:open", openFromHeader);
  }, [contributions.length, supportsGreetingsDialog]);

  const closeAllGreetings = () => {
    if (dialogHistoryEntryRef.current) {
      window.history.back();
    } else {
      setIsAllGreetingsOpen(false);
    }
  };

  const allGreetingsDialog = supportsGreetingsDialog && contributions.length > 0 ? (
      <dialog
        ref={dialogRef}
        className={`${styles.allGreetingsDialog} ${isPaperBirthday ? styles.paperAllGreetingsDialog : ""}`.trim()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="all-greetings-title"
        onClose={() => {
          setIsAllGreetingsOpen(false);
          const source = dialogTriggerRef.current;
          if (source === "mobile") {
            window.setTimeout(() => routeMobileShowAllButtonRef.current?.focus(), 0);
          } else {
            window.dispatchEvent(new CustomEvent("route-greetings:closed", { detail: { source } }));
          }
        }}
        onCancel={(event) => {
          event.preventDefault();
          closeAllGreetings();
        }}
      >
        <div className={`${styles.allGreetingsDialogHeader} ${isPaperBirthday ? styles.paperAllGreetingsDialogHeader : ""}`.trim()}>
          <div>
            <h2 id="all-greetings-title">Все поздравления</h2>
            <p>{getRouteGreetingCountLabel(contributions.length)}</p>
          </div>
          <button type="button" className={`${styles.dialogCloseButton} ${isPaperBirthday ? styles.paperDialogCloseButton : ""}`.trim()} onClick={closeAllGreetings} aria-label="Закрыть все поздравления">
            <span aria-hidden="true">×</span>
          </button>
        </div>
        <div className={styles.allGreetingsList}>
          {contributions.map((item, index) => renderMessageCard(item, index, Number.POSITIVE_INFINITY, isPaperBirthday, isRouteAdventure, false))}
        </div>
      </dialog>
  ) : null;

  const routeMobileShowAllButton = supportsGreetingsDialog && contributions.length > routeVisibleCount ? (
    <button
      type="button"
      ref={routeMobileShowAllButtonRef}
      className={`${styles.showAllRouteButton} ${isPaperBirthday ? styles.paperShowAllButton : ""}`.trim()}
      onClick={() => {
        dialogTriggerRef.current = "mobile";
        setIsAllGreetingsOpen(true);
      }}
    >
      {`\u041f\u043e\u043a\u0430\u0437\u0430\u0442\u044c \u0432\u0441\u0435 ${getRouteMessageCountLabel(contributions.length)}`}
    </button>
  ) : null;

  const loadMoreButton = !supportsGreetingsDialog && hasMore ? (
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
      <div
        className={`${finalCardStyles.messageSplitFixed} ${
          supportsGreetingsDialog && messageMediaLayout === "portrait" ? finalCardStyles.messageSplitPortrait : ""
        }`.trim()}
      >
        <div className={finalCardStyles.messageColumnScroller}>
          <div className={finalCardStyles.messageColumnPage}>
            {contributions.map((item, index) =>
              renderMessageCard(
                item,
                index,
                profile.maxChars,
                isPaperBirthday,
                isRouteAdventure,
                !isRouteAdventure && index >= visibleCount,
                supportsGreetingsDialog && index >= routeVisibleCount
              )
            )}
          </div>
          {loadMoreButton}
          {routeMobileShowAllButton}
          {allGreetingsDialog}
        </div>
        {renderMediaRail(messageMediaAssets, messageMediaLayout, isPaperBirthday, isRouteAdventure)}
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
          renderMessageCard(
            item,
            index,
            profile.maxChars,
            isPaperBirthday,
            isRouteAdventure,
            !isRouteAdventure && index >= visibleCount,
            supportsGreetingsDialog && index >= routeVisibleCount
          )
        )}
      </div>
      {loadMoreButton}
      {routeMobileShowAllButton}
      {allGreetingsDialog}
    </div>
  );
};
