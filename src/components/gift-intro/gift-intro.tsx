"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import Image from "next/image";
import { BrandLogo } from "@/components/brand/brand-logo";
import type { CardTemplateId } from "@/lib/cards/templates";
import { defaultGiftAnimationId, type GiftAnimationId } from "@/lib/gift-animations";
import styles from "./gift-intro.module.css";

type GiftIntroState = "idle" | "playing" | "done";

type GiftIntroProps = {
  slug: string;
  recipientName: string;
  subtitle?: string;
  fromLabel?: string;
  templateId?: CardTemplateId;
  animationId?: GiftAnimationId;
  accent?: string;
  closedEnvelopeImage?: string;
  openEnvelopeImage?: string;
  forceIntro?: boolean;
  children: React.ReactNode;
};

const STORAGE_KEY_PREFIX = "gift-opened-";

const INTRO_DURATION = 4800;

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
  subtitle = "для вас собрали тёплые слова",
  fromLabel,
  templateId = "warm-classic",
  animationId = defaultGiftAnimationId,
  accent,
  closedEnvelopeImage = "/assets/gift/envelope-closed.png",
  openEnvelopeImage = "/assets/gift/envelope-open.png",
  forceIntro = false,
  children
}: GiftIntroProps) => {
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
  const [isFinalCardRevealed, setIsFinalCardRevealed] = useState(false);
  const [isHoveringCta, setIsHoveringCta] = useState(false);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const shouldSkipIntro = alreadyOpened && state === "idle" && !forceIntro;

  const clearTimers = useCallback(() => {
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
  }, []);

  useEffect(() => {
    const shouldLockScroll = !shouldSkipIntro && state !== "done";
    document.body.style.overflow = shouldLockScroll ? "hidden" : "";

    return () => {
      document.body.style.overflow = "";
    };
  }, [state, shouldSkipIntro]);

  useEffect(() => {
    return () => clearTimers();
  }, [clearTimers]);

  const schedule = useCallback((callback: () => void, delay: number) => {
    timersRef.current.push(setTimeout(callback, delay));
  }, []);

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

    clearTimers();
    setIsFinalCardRevealed(false);
    setState("playing");
    schedule(() => setIsFinalCardRevealed(true), 3550);
    schedule(() => {
      saveOpenedFlag();
      setState("done");
    }, INTRO_DURATION);
  }, [state, saveOpenedFlag, clearTimers, schedule]);

  const handleSkip = useCallback(() => {
    clearTimers();
    saveOpenedFlag();

    setState("done");
  }, [clearTimers, saveOpenedFlag]);

  const handleReplay = useCallback(() => {
    clearTimers();
    try {
      sessionStorage.removeItem(`${STORAGE_KEY_PREFIX}${slug}`);
    } catch {
      // ignore
    }
    setIsFinalCardRevealed(false);
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

  if (shouldSkipIntro) {
    return <>{children}</>;
  }

  const name = recipientName.trim() || "Вам";
  const accentColor = accent ?? "#bf6c47";
  const stateClass = styles[state];
  const showFinalCard = state === "playing" && isFinalCardRevealed;
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
      {showFinalCard ? <div className={`${styles.finalReveal} ${styles.finalRevealReady}`}>{children}</div> : null}
      <div
        className={`${styles.page} ${stateClass}`}
        data-intro-state={state}
        data-animation-id={animationId}
        aria-live="polite"
      >
        <div className={styles.vignette} aria-hidden="true" />

        <div className={styles.introContent}>
          <div className={styles.giftKicker}>
            <span className={styles.giftKickerIcon} aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="3" y="8" width="18" height="13" rx="2" stroke="currentColor" strokeWidth="1.5" />
                <path d="M12 8v13" stroke="currentColor" strokeWidth="1.5" />
                <path d="M3 14.5h18" stroke="currentColor" strokeWidth="1.5" />
                <path d="M12 8c0-2.5 2.5-4 4-4s2 2 0 4h-4z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
                <path d="M12 8c0-2.5-2.5-4-4-4s-2 2 0 4h4z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
              </svg>
            </span>
            <span className={styles.giftKickerText}>Вам подарили открытку</span>
          </div>

          <div className={`${styles.envelopeScene} ${isHoveringCta && isBeforeOpen ? styles.ctaHover : ""}`}>
            <span className={styles.botanicalSprig} aria-hidden="true">
              <i /><i /><i /><i />
            </span>
            {/* Intentional decorative layer in the envelope composition. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/assets/gift/flower-bottom-left.png"
              alt=""
              className={styles.envelopeFlower}
              aria-hidden="true"
            />
            <span className={`${styles.introHeart} ${styles.introHeartOne}`} aria-hidden="true">♡</span>
            <span className={`${styles.introHeart} ${styles.introHeartTwo}`} aria-hidden="true">♡</span>
            <span className={`${styles.introHeart} ${styles.introHeartThree}`} aria-hidden="true">♡</span>
            <div className={styles.envelope}>
              <Image
                src={openEnvelopeImage}
                alt=""
                fill
                priority
                sizes="(max-width: 480px) 86vw, 460px"
                className={`${styles.envelopeImage} ${styles.openEnvelopeBack}`}
                aria-hidden="true"
              />
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
                    <BrandLogo variant="mark" className={styles.cardBackBrand} />
                  </div>
                  <div className={styles.envelopeCardInsideTop} aria-hidden="true">
                    <div className={`${styles.cardTemplatePreview} ${styles.cardTemplatePreviewUpper}`}>
                      <div className={styles.cardTemplateCanvas}>{children}</div>
                    </div>
                  </div>
                </div>
              </div>

              <Image
                src={openEnvelopeImage}
                alt=""
                fill
                priority
                sizes="(max-width: 480px) 86vw, 460px"
                className={`${styles.envelopeImage} ${styles.openEnvelopePocket}`}
                aria-hidden="true"
              />
              <Image
                src={closedEnvelopeImage}
                alt="Закрытый бумажный конверт"
                fill
                priority
                sizes="(max-width: 480px) 86vw, 460px"
                className={`${styles.envelopeImage} ${styles.closedEnvelope}`}
              />

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
              <span className={styles.titleDivider} aria-hidden="true"><i />♡<i /></span>
              <h1 className={styles.subtitleLine}>
                {subtitle}
                {fromLabel?.trim() ? <span className={styles.subtitleAccent}>{fromLabel.trim()}</span> : null}
              </h1>
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
                aria-label="Посмотреть, что внутри"
                disabled={state !== "idle"}
              >
                <span className={styles.ctaContent}>
                  <span className={styles.ctaSparkle} aria-hidden="true">✨</span>
                  Посмотреть, что внутри
                </span>
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
