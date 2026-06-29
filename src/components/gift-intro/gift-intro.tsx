"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import type { CardTemplateId } from "@/lib/cards/templates";
import styles from "./gift-intro.module.css";

type GiftIntroState =
  | "idle"
  | "press"
  | "sealBreak"
  | "flapOpen"
  | "pause"
  | "cardPull"
  | "cardHero"
  | "revealGift"
  | "done";

type GiftIntroProps = {
  slug: string;
  recipientName: string;
  templateId?: CardTemplateId;
  accent?: string;
  forceIntro?: boolean;
  children: React.ReactNode;
};

const STORAGE_KEY_PREFIX = "gift-opened-";

const TIMING = {
  press: 160,
  sealBreak: 240,
  flapOpen: 720,
  pause: 480,
  cardPull: 820,
  cardHero: 1050,
  revealGift: 520
} as const;

const TOTAL_DURATION =
  TIMING.press +
  TIMING.sealBreak +
  TIMING.flapOpen +
  TIMING.pause +
  TIMING.cardPull +
  TIMING.cardHero +
  TIMING.revealGift;

const subscribeReducedMotion = (callback: () => void) => {
  const media = window.matchMedia("(prefers-reduced-motion: reduce)");
  media.addEventListener("change", callback);
  return () => media.removeEventListener("change", callback);
};

const getReducedMotionSnapshot = () => {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
};

const getReducedMotionServerSnapshot = () => false;

const subscribeSessionStorage = (callback: () => void) => {
  const handleStorage = (event: StorageEvent) => {
    if (event.storageArea === sessionStorage) {
      callback();
    }
  };
  window.addEventListener("storage", handleStorage);
  return () => window.removeEventListener("storage", handleStorage);
};

const getOpenedServerSnapshot = () => false;

export const GiftIntro = ({
  slug,
  recipientName,
  templateId = "warm-classic",
  accent,
  forceIntro = false,
  children
}: GiftIntroProps) => {
  const reducedMotion = useSyncExternalStore(
    subscribeReducedMotion,
    getReducedMotionSnapshot,
    getReducedMotionServerSnapshot
  );

  const getOpenedSnapshot = useCallback(() => {
    if (typeof window === "undefined") return false;
    try {
      return sessionStorage.getItem(`${STORAGE_KEY_PREFIX}${slug}`) === "1";
    } catch {
      return false;
    }
  }, [slug]);

  const alreadyOpened = useSyncExternalStore(subscribeSessionStorage, getOpenedSnapshot, getOpenedServerSnapshot);

  const [state, setState] = useState<GiftIntroState>("idle");
  const [isHoveringCta, setIsHoveringCta] = useState(false);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  const clearTimers = useCallback(() => {
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
  }, []);

  useEffect(() => {
    const shouldLockScroll = state !== "revealGift" && state !== "done";
    document.body.style.overflow = shouldLockScroll ? "hidden" : "";
  }, [state]);

  useEffect(() => {
    return () => clearTimers();
  }, [clearTimers]);

  const schedule = useCallback((callback: () => void, delay: number) => {
    timersRef.current.push(setTimeout(callback, delay));
  }, []);

  const handleDone = useCallback(() => {
    setState("done");
  }, []);

  const runOpeningSequence = useCallback(() => {
    let cursor = TIMING.press;
    schedule(() => setState("sealBreak"), cursor);
    cursor += TIMING.sealBreak;
    schedule(() => setState("flapOpen"), cursor);
    cursor += TIMING.flapOpen;
    schedule(() => setState("pause"), cursor);
    cursor += TIMING.pause;
    schedule(() => setState("cardPull"), cursor);
    cursor += TIMING.cardPull;
    schedule(() => setState("cardHero"), cursor);
    cursor += TIMING.cardHero;
    schedule(() => setState("revealGift"), cursor);
    cursor += TIMING.revealGift;
    schedule(handleDone, cursor);
  }, [schedule, handleDone]);

  const saveOpenedFlag = useCallback(() => {
    try {
      sessionStorage.setItem(`${STORAGE_KEY_PREFIX}${slug}`, "1");
    } catch {
      // ignore storage errors
    }
  }, [slug]);

  const handleOpen = useCallback(() => {
    if (state !== "idle") {
      return;
    }

    saveOpenedFlag();

    if (reducedMotion) {
      setState("revealGift");
      schedule(handleDone, 350);
      return;
    }

    setState("press");
    runOpeningSequence();
  }, [state, reducedMotion, saveOpenedFlag, schedule, handleDone, runOpeningSequence]);

  const handleSkip = useCallback(() => {
    clearTimers();
    saveOpenedFlag();

    if (reducedMotion) {
      setState("done");
      return;
    }

    setState("revealGift");
    schedule(handleDone, 350);
  }, [clearTimers, saveOpenedFlag, reducedMotion, schedule, handleDone]);

  const handleReplay = useCallback(() => {
    clearTimers();
    try {
      sessionStorage.removeItem(`${STORAGE_KEY_PREFIX}${slug}`);
    } catch {
      // ignore
    }
    setState("idle");
  }, [clearTimers, slug]);

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLButtonElement>) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        handleOpen();
      }
    },
    [handleOpen]
  );

  if (alreadyOpened && !forceIntro) {
    return <>{children}</>;
  }

  const name = recipientName.trim() || "Вам";
  const accentColor = accent ?? "#bf6c47";
  const stateClass = styles[state];
  const showFinalCard = state === "revealGift" || state === "done";
  const isBeforeOpen = state === "idle";

  if (state === "done") {
    return (
      <div className={styles.giftWrapper}>
        {children}
        <div className={styles.replayBar}>
          <button type="button" className={styles.replayButton} onClick={handleReplay}>
            <span aria-hidden="true">↺</span>
            Открыть ещё раз
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      {showFinalCard ? <div className={styles.finalReveal}>{children}</div> : null}
      <div
        className={`${styles.page} ${stateClass} ${reducedMotion ? styles.reducedMotion : ""}`}
        data-intro-state={state}
        aria-live="polite"
      >
        <div className={styles.vignette} aria-hidden="true" />

        <div className={styles.introContent}>
          <div className={`${styles.envelopeScene} ${isHoveringCta && isBeforeOpen ? styles.ctaHover : ""}`}>
            <div className={styles.envelope}>
              <div className={styles.envelopeBack} />
              <div className={styles.envelopeGlow} aria-hidden="true" />

              <div className={styles.envelopeCard}>
                <div className={styles.envelopeCardInside}>
                  <div className={`${styles.cardTemplatePreview} ${styles.cardTemplatePreviewLower}`} aria-hidden="true">
                    <div className={styles.cardTemplateCanvas}>{children}</div>
                  </div>
                </div>
                <div className={styles.envelopeCardFold}>
                  <div className={styles.envelopeCardFront}>
                    <span className={styles.cardFoldLine} aria-hidden="true" />
                    <span className={styles.cardAccent} style={{ backgroundColor: accentColor }} aria-hidden="true" />
                    <span className={styles.cardPaperLines} aria-hidden="true" />
                    <span className={`${styles.cardBackSprig} ${styles.cardBackSprigLeft}`} aria-hidden="true" />
                    <span className={`${styles.cardBackSprig} ${styles.cardBackSprigRight}`} aria-hidden="true" />
                    <span className={styles.cardBackEmblem} aria-hidden="true">
                      <span className={styles.cardHeart}>♡</span>
                    </span>
                    <span className={styles.cardBackBrand}>Дари слова</span>
                    <span className={styles.cardBackCaption}>с теплом от близких</span>
                  </div>
                  <div className={styles.envelopeCardInsideTop} aria-hidden="true">
                    <div className={`${styles.cardTemplatePreview} ${styles.cardTemplatePreviewUpper}`}>
                      <div className={styles.cardTemplateCanvas}>{children}</div>
                    </div>
                  </div>
                </div>
              </div>

              <div className={styles.envelopeLeft} aria-hidden="true" />
              <div className={styles.envelopeRight} aria-hidden="true" />
              <div className={styles.envelopeBottom} aria-hidden="true" />
              <div className={styles.envelopeFlap} aria-hidden="true">
                <div className={styles.envelopeFlapFront} />
                <div className={styles.envelopeFlapBack} />
              </div>
              <div className={styles.envelopeSeal} aria-hidden="true">
                <span>♡</span>
              </div>

              <div className={styles.heartFloat1} aria-hidden="true">♡</div>
              <div className={styles.heartFloat2} aria-hidden="true">♡</div>
              <div className={styles.heartFloat3} aria-hidden="true">♡</div>
            </div>
          </div>

          <div className={styles.textGroup}>
            <div className={styles.titleBlock}>
              <span className={styles.nameLine}>{name}</span>
              <h1 className={styles.subtitleLine}>для вас собрали тёплые слова</h1>
            </div>
            <div className={styles.actions}>
              <button
                type="button"
                className={styles.ctaButton}
                onClick={handleOpen}
                onKeyDown={handleKeyDown}
                onMouseEnter={() => setIsHoveringCta(true)}
                onMouseLeave={() => setIsHoveringCta(false)}
                onFocus={() => setIsHoveringCta(true)}
                onBlur={() => setIsHoveringCta(false)}
                aria-label="Открыть открытку"
                disabled={state !== "idle"}
              >
                Открыть открытку
              </button>
              <button type="button" className={styles.skipLink} onClick={handleSkip}>
                Пропустить
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

type GiftPlaceholderProps = {
  recipientName?: string;
};

export const GiftPlaceholder = ({ recipientName }: GiftPlaceholderProps) => {
  const name = recipientName?.trim();

  return (
    <main className={styles.placeholder}>
      <div className={styles.placeholderCard}>
        <div className={styles.placeholderIcon} aria-hidden="true">✉</div>
        <h1 className={styles.placeholderTitle}>
          {name ? `${name}, открытка пока готовится` : "Открытка пока готовится"}
        </h1>
        <p className={styles.placeholderText}>
          Как только организатор опубликует открытку, здесь появится финальная версия с поздравлениями и фото.
        </p>
      </div>
    </main>
  );
};
