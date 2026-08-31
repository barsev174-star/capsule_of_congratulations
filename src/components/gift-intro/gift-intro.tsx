"use client";

import Image from "next/image";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type CSSProperties
} from "react";
import { BrandLogo } from "@/components/brand/brand-logo";
import type { CardTemplate, CardTemplateId } from "@/lib/cards/templates";
import type { TemplateGiftVisualPreset } from "@/lib/templates/profile";
import { defaultGiftAnimationId, type GiftAnimationId } from "@/lib/gift-animations";
import type { GiftRevealMessagePreview } from "@/lib/gift-reveal-preview";
import { getGiftRevealPreviewProfile } from "@/lib/gift-reveal-profiles";
import { CollectRevealScene } from "./collect-reveal-scene";
import { GiftIntro as LegacyGiftIntro } from "./legacy-v1/gift-intro";
import styles from "./gift-intro.module.css";

export type GiftIntroPreviewPhoto = {
  id: string;
  src: string;
  alt: string;
  objectPosition?: string;
};

export type GiftIntroPreview = {
  headline: string;
  messages?: readonly GiftRevealMessagePreview[];
  qualities?: readonly string[];
  photos: readonly GiftIntroPreviewPhoto[];
  phrases: readonly string[];
};

type GiftIntroState =
  | "idle"
  | "intro"
  | "releasing-seal"
  | "opening-envelope"
  | "extracting-card"
  | "unfolding-card"
  | "assembling-card"
  | "focusing"
  | "highlighting-messages"
  | "fading-noise"
  | "detaching-content"
  | "grouping-content"
  | "holding-content"
  | "revealing-preview"
  | "embedding-messages"
  | "embedding-photos"
  | "settling"
  | "handoff"
  | "finished"
  | "skipped";

export type GiftIntroVariant = "assembled" | "legacy";

export type GiftIntroProps = {
  recipientName: string;
  subtitle?: string;
  fromLabel?: string;
  previewKicker?: string;
  previewPreset?: CardTemplate["introPreset"];
  previewDecor?: readonly string[];
  visualPreset?: TemplateGiftVisualPreset;
  templateId?: CardTemplateId;
  animationId?: GiftAnimationId;
  accent?: string;
  assemblyPreview?: GiftIntroPreview;
  variant?: GiftIntroVariant;
  forceFullMotion?: boolean;
  onIntroDone?: () => void;
  children: React.ReactNode;
};

const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";
const REDUCED_MOTION_DURATION = 420;
const ENVELOPE_SEQUENCE = [
  ["releasing-seal", 220],
  ["opening-envelope", 430],
  ["extracting-card", 1290],
  ["unfolding-card", 2170],
  ["assembling-card", 3190],
  ["handoff", 5130],
  ["finished", 6660]
] as const satisfies readonly (readonly [GiftIntroState, number])[];

const COLLECT_SEQUENCE = [
  ["highlighting-messages", 100],
  ["detaching-content", 900],
  ["fading-noise", 1250],
  ["grouping-content", 1550],
  ["holding-content", 2750],
  ["revealing-preview", 3150],
  ["embedding-messages", 3700],
  ["embedding-photos", 4750],
  ["settling", 5350],
  ["handoff", 5800],
  ["finished", 6400]
] as const satisfies readonly (readonly [GiftIntroState, number])[];

const STATE_CLASS: Partial<Record<GiftIntroState, string>> = {
  idle: styles.idle,
  intro: styles.intro,
  "releasing-seal": styles.releasingSeal,
  "opening-envelope": styles.openingEnvelope,
  "extracting-card": styles.extractingCard,
  "unfolding-card": styles.unfoldingCard,
  "assembling-card": styles.assemblingCard,
  handoff: styles.handoff
};

const subscribeReducedMotion = (callback: () => void) => {
  const mediaQuery = window.matchMedia?.(REDUCED_MOTION_QUERY);
  mediaQuery?.addEventListener("change", callback);
  return () => mediaQuery?.removeEventListener("change", callback);
};

const getReducedMotionSnapshot = () => window.matchMedia?.(REDUCED_MOTION_QUERY).matches ?? false;
const getReducedMotionServerSnapshot = () => false;
const cleanPreviewText = (value: string, fallback: string) => value.trim() || fallback;

const TEMPLATE_ASSEMBLY_EYEBROWS: Record<TemplateGiftVisualPreset, string> = {
  "paper-celebration": "С днём рождения!",
  expedition: "История нашего пути",
  "school-playful": "Школьная открытка",
  "school-formal": "Открытка учителю",
  "caregiver-playful": "С любовью от детей",
  editorial: "Открытка от команды"
};

const LightweightCardPreview = ({
  recipientName,
  fromLabel,
  kicker,
  templateId,
  accent,
  preset,
  decor
}: {
  recipientName: string;
  fromLabel?: string;
  kicker: string;
  templateId: CardTemplateId;
  accent: string;
  preset: NonNullable<CardTemplate["introPreset"]>;
  decor: readonly string[];
}) => (
  <div
    className={styles.lightweightCardPreview}
    data-template-id={templateId}
    data-preview-preset={preset}
    data-gift-intro-preview="lightweight"
    style={{ "--gi-preview-accent": accent } as CSSProperties}
  >
    {preset === "scrapbook" ? (
      <>
        <span className={styles.schoolPreviewTape} data-school-preview-decor="tape" aria-hidden="true" />
        <span className={styles.schoolPreviewSticker} data-school-preview-decor="sticker" aria-hidden="true">5+</span>
        {decor.slice(0, 2).map((src, index) => (
          <span
            key={`${src}-${index}`}
            className={`${styles.schoolPreviewDoodle} ${index === 0 ? styles.schoolPreviewDoodleBoy : styles.schoolPreviewDoodleGirl}`}
            data-school-preview-decor={index === 0 ? "boy" : "girl"}
            aria-hidden="true"
          >
            <Image src={src} alt="" width={54} height={78} />
          </span>
        ))}
      </>
    ) : null}
    {preset === "classic" ? (
      <>
        <span className={styles.classicPreviewFrame} aria-hidden="true" />
        <span className={styles.classicPreviewRule} aria-hidden="true" />
        {decor.slice(0, 2).map((src, index) => (
          <span
            key={`${src}-${index}`}
            className={`${styles.classicPreviewDecor} ${index === 0 ? styles.classicPreviewDecorLeft : styles.classicPreviewDecorRight}`}
            data-classic-preview-decor={index === 0 ? "board" : "bouquet"}
            aria-hidden="true"
          >
            <Image src={src} alt="" width={72} height={90} />
          </span>
        ))}
      </>
    ) : null}
    <span className={styles.lightweightCardKicker}>{kicker}</span>
    <strong>{recipientName}</strong>
    <span className={styles.lightweightCardRule} />
    <span className={styles.lightweightCardLine} />
    <span className={`${styles.lightweightCardLine} ${styles.lightweightCardLineShort}`} />
    <small>{fromLabel?.trim() || "С тёплыми словами"}</small>
  </div>
);

const TemplateFoundation = ({
  templateId,
  visualPreset,
  preset,
  accent,
  decor = [],
  className
}: {
  templateId: CardTemplateId;
  visualPreset?: TemplateGiftVisualPreset;
  preset: NonNullable<CardTemplate["introPreset"]>;
  accent: string;
  decor?: readonly string[];
  className?: string;
}) => {
  const isPaperBirthday = visualPreset === "paper-celebration";
  const hasArtDirectedFoundation = Boolean(visualPreset);

  const artLayers = visualPreset && visualPreset !== "paper-celebration" ? {
    expedition: [
      ["map", styles.foundationRouteMap],
      ["compass", styles.foundationRouteCompass],
      ["stamp", styles.foundationRouteStamp],
      ["carabiner", styles.foundationRouteCarabiner]
    ],
    "school-playful": [
      ["backpack", styles.foundationSchoolBackpack],
      ["globe", styles.foundationSchoolGlobe],
      ["student", styles.foundationSchoolStudent],
      ["student-girl", styles.foundationSchoolStudentGirl]
    ],
    "school-formal": [
      ["board", styles.foundationClassicBoard],
      ["bouquet", styles.foundationClassicBouquet],
      ["gold-rule", styles.foundationClassicRule],
      ["seal", styles.foundationClassicSeal]
    ],
    "caregiver-playful": [
      ["drawing", styles.foundationKindergartenDrawing],
      ["still-life", styles.foundationKindergartenStillLife],
      ["blue-paper", styles.foundationKindergartenBluePaper],
      ["yellow-paper", styles.foundationKindergartenYellowPaper]
    ],
    editorial: [
      ["notebook", styles.foundationEditorialNotebook],
      ["envelope", styles.foundationEditorialEnvelope],
      ["teal-block", styles.foundationEditorialTealBlock],
      ["orange-block", styles.foundationEditorialOrangeBlock]
    ]
  }[visualPreset] : null;

  return (
    <div
      className={`${styles.templateFoundation} ${className ?? ""}`}
      data-template-foundation={templateId}
      data-foundation-preset={preset}
      style={{ "--gi-preview-accent": accent } as CSSProperties}
    >
      {isPaperBirthday ? (
        <>
          <span className={styles.paperBirthdaySheet} data-paper-foundation="sheet" />
          <span className={`${styles.paperBirthdayDecor} ${styles.paperBirthdayCake}`} data-paper-foundation="cake" />
          <span className={`${styles.paperBirthdayDecor} ${styles.paperBirthdayBouquet}`} data-paper-foundation="bouquet" />
          <span className={`${styles.paperBirthdayDecor} ${styles.paperBirthdayConfetti}`} data-paper-foundation="confetti" />
          <span className={`${styles.paperBirthdayDecor} ${styles.paperBirthdayFloral}`} data-paper-foundation="floral" />
        </>
      ) : hasArtDirectedFoundation ? (
        <span className={styles.templateArtScene} data-template-visual={visualPreset} aria-hidden="true">
          {artLayers?.map(([name, layerClass]) => (
            <span key={name} className={`${styles.templateArtLayer} ${layerClass}`} data-foundation-art={name} />
          ))}
        </span>
      ) : (
        <>
          <span className={styles.templateAccent} />
          <span className={styles.templateTitleMark} />
          <span className={styles.templateTitleLine} />
          <span className={`${styles.templatePhotoSlot} ${styles.templatePhotoSlot1}`} />
          <span className={`${styles.templatePhotoSlot} ${styles.templatePhotoSlot2}`} />
          <span className={`${styles.templatePhotoSlot} ${styles.templatePhotoSlot3}`} />
          <span className={`${styles.templateTextSlot} ${styles.templateTextSlot1}`} />
          <span className={`${styles.templateTextSlot} ${styles.templateTextSlot2}`} />
          <span className={`${styles.templateTextSlot} ${styles.templateTextSlot3}`} />
          {decor.slice(0, 2).map((src, index) => (
            <span key={`${src}-${index}`} className={`${styles.templateDecor} ${styles[`templateDecor${index + 1}`]}`}>
              <Image src={src} alt="" fill sizes="110px" />
            </span>
          ))}
        </>
      )}
    </div>
  );
};

const GiftIntroAssembled = ({
  recipientName,
  subtitle = "для вас собрали тёплые слова",
  fromLabel,
  previewKicker = "Открытка для",
  previewPreset = "default",
  previewDecor = [],
  visualPreset,
  templateId = "warm-classic",
  animationId = defaultGiftAnimationId,
  accent,
  assemblyPreview,
  forceFullMotion = false,
  onIntroDone,
  children
}: GiftIntroProps) => {
  const systemPrefersReducedMotion = useSyncExternalStore(
    subscribeReducedMotion,
    getReducedMotionSnapshot,
    getReducedMotionServerSnapshot
  );
  const [fullMotionRequested, setFullMotionRequested] = useState(forceFullMotion);
  const prefersReducedMotion = systemPrefersReducedMotion && !fullMotionRequested && !forceFullMotion;
  const [state, setState] = useState<GiftIntroState>("idle");
  const [isHoveringCta, setIsHoveringCta] = useState(false);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const onIntroDoneRef = useRef(onIntroDone);
  const bodyOverflowRef = useRef<string | null>(null);
  const giftWrapperRef = useRef<HTMLDivElement>(null);

  const name = cleanPreviewText(recipientName, "Вам");
  const resolvedPreviewKicker = cleanPreviewText(previewKicker, "Открытка для");
  const accentColor = accent ?? "#e9652f";
  const phrases = (assemblyPreview?.phrases ?? []).filter(Boolean).slice(0, 3);
  const photos = (assemblyPreview?.photos ?? []).slice(0, 3);
  const messages = (assemblyPreview?.messages ?? []).slice(0, 6);
  const qualities = (assemblyPreview?.qualities ?? []).filter(Boolean).slice(0, 5);
  const headline = cleanPreviewText(
    assemblyPreview?.headline ?? "",
    `${name}, эта открытка собрана для вас`
  );
  const resolvedVisualPreset = visualPreset ?? (
    templateId === "paper-birthday"
      ? "paper-celebration"
      : templateId === "route-adventure"
        ? "expedition"
        : undefined
  );
  const assemblyEyebrow = resolvedVisualPreset ? TEMPLATE_ASSEMBLY_EYEBROWS[resolvedVisualPreset] : undefined;
  const isCollectMessages = animationId === "collect-messages";
  const collectProfile = getGiftRevealPreviewProfile(templateId)
    ?? getGiftRevealPreviewProfile("paper-birthday");
  const isFinished = state === "finished" || state === "skipped";
  const shouldRenderFinalCard = [
    "unfolding-card",
    "assembling-card",
    "revealing-preview",
    "embedding-messages",
    "embedding-photos",
    "settling",
    "handoff",
    "finished",
    "skipped"
  ].includes(state);
  const isFinalCardVisible = state === "handoff" || isFinished;
  const isIntroVisible = !isFinished;

  useEffect(() => {
    onIntroDoneRef.current = onIntroDone;
  }, [onIntroDone]);

  const clearTimers = useCallback(() => {
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
  }, []);

  const schedule = useCallback((callback: () => void, delay: number) => {
    timersRef.current.push(setTimeout(callback, delay));
  }, []);

  const finishIntro = useCallback((nextState: "finished" | "skipped") => {
    setState(nextState);
    onIntroDoneRef.current?.();
  }, []);

  useEffect(() => () => clearTimers(), [clearTimers]);

  useEffect(() => {
    if (!isIntroVisible) {
      if (bodyOverflowRef.current !== null) {
        document.body.style.overflow = bodyOverflowRef.current;
        bodyOverflowRef.current = null;
      }
      return;
    }

    if (bodyOverflowRef.current === null) {
      bodyOverflowRef.current = document.body.style.overflow;
    }
    document.body.style.overflow = "hidden";

    return () => {
      if (bodyOverflowRef.current !== null) {
        document.body.style.overflow = bodyOverflowRef.current;
        bodyOverflowRef.current = null;
      }
    };
  }, [isIntroVisible]);

  useEffect(() => {
    const isComplexMotionPlaying = [
      "intro",
      "releasing-seal",
      "opening-envelope",
      "extracting-card",
      "unfolding-card",
      "assembling-card",
      "focusing",
      "highlighting-messages",
      "fading-noise",
      "detaching-content",
      "grouping-content",
      "holding-content",
      "revealing-preview",
      "embedding-messages",
      "embedding-photos",
      "settling"
    ].includes(state);
    if (!prefersReducedMotion || !isComplexMotionPlaying) return;

    clearTimers();
    if (isCollectMessages) {
      schedule(() => setState("revealing-preview"), 0);
      schedule(() => setState("handoff"), 180);
      schedule(() => finishIntro("finished"), 520);
      return;
    }
    schedule(() => setState("handoff"), 0);
    schedule(() => finishIntro("finished"), REDUCED_MOTION_DURATION);
  }, [clearTimers, finishIntro, isCollectMessages, prefersReducedMotion, schedule, state]);

  const startSequence = useCallback((requestFullMotion: boolean) => {
    if (state !== "idle") return;

    clearTimers();
    setIsHoveringCta(false);
    if (requestFullMotion) setFullMotionRequested(true);
    if (prefersReducedMotion && !requestFullMotion) {
      if (isCollectMessages) {
        setState("revealing-preview");
        schedule(() => setState("handoff"), 180);
        schedule(() => finishIntro("finished"), 520);
      } else {
        setState("handoff");
        schedule(() => finishIntro("finished"), REDUCED_MOTION_DURATION);
      }
      return;
    }

    setState(isCollectMessages ? "focusing" : "intro");
    const sequence = isCollectMessages ? COLLECT_SEQUENCE : ENVELOPE_SEQUENCE;
    sequence.forEach(([nextState, delay]) => {
      schedule(() => {
        if (nextState === "finished") {
          finishIntro("finished");
          return;
        }
        setState(nextState);
      }, delay);
    });
  }, [clearTimers, finishIntro, isCollectMessages, prefersReducedMotion, schedule, state]);

  const handleOpen = useCallback(() => startSequence(false), [startSequence]);

  const handleSkip = useCallback(() => {
    clearTimers();
    finishIntro("skipped");
  }, [clearTimers, finishIntro]);

  useEffect(() => {
    if (!isIntroVisible) {
      giftWrapperRef.current?.focus({ preventScroll: true });
      return;
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") handleSkip();
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [handleSkip, isIntroVisible]);

  const handleReplay = useCallback(() => {
    clearTimers();
    setState("idle");
  }, [clearTimers]);

  return (
    <>
      <div
        ref={giftWrapperRef}
        className={`${styles.giftWrapper} ${isFinalCardVisible ? styles.finalCardVisible : styles.finalCardHidden}`}
        data-animation-id={animationId}
        data-motion-mode={prefersReducedMotion ? "reduced" : "full"}
        aria-hidden={isIntroVisible}
        inert={isIntroVisible ? true : undefined}
        tabIndex={-1}
      >
        {shouldRenderFinalCard ? children : null}
        {isFinished ? (
          <div className={styles.replayBar}>
            <button type="button" className={styles.replayButton} onClick={handleReplay}>
              <span aria-hidden="true">↻</span>
              Посмотреть ещё раз
            </button>
          </div>
        ) : null}
      </div>

      {isIntroVisible ? (
        <section
          className={`${styles.page} ${STATE_CLASS[state] ?? ""} ${isHoveringCta ? styles.scenePrimed : ""}`}
          data-intro-state={state}
          data-animation-id={animationId}
          data-motion-mode={prefersReducedMotion ? "reduced" : "full"}
          role="dialog"
          aria-modal="true"
          aria-label={`Подарочная открытка для ${name}`}
        >
          <div className={styles.sceneLight} aria-hidden="true" />
          <header className={styles.introHeader}>
            <BrandLogo className={styles.introBrand} />
            <button type="button" className={styles.skipButton} onClick={handleSkip}>
              Пропустить
            </button>
          </header>

          {isCollectMessages && collectProfile ? (
            <CollectRevealScene
              phase={state}
              recipientName={name}
              fromLabel={fromLabel}
              messages={messages}
              photos={photos}
              profile={collectProfile}
              previewFoundation={(
                <TemplateFoundation
                  templateId={templateId}
                  visualPreset={collectProfile.visualPreset}
                  preset={previewPreset}
                  accent={accentColor}
                  decor={previewDecor}
                />
              )}
              onOpen={handleOpen}
              disabled={state !== "idle"}
              reducedMotion={prefersReducedMotion}
            />
          ) : (
          <div className={styles.introLayout}>
            <div className={styles.sceneCopy}>
              <p className={styles.giftKicker}>Вам подарили открытку</p>
              <h1 className={styles.recipientName}>{name}</h1>
              <p className={styles.subtitle}>
                {subtitle}
                {fromLabel?.trim() ? <span>{fromLabel.trim()}</span> : null}
              </p>
              <div className={styles.actions}>
                <button
                  type="button"
                  className={styles.ctaButton}
                  onClick={handleOpen}
                  onMouseEnter={() => setIsHoveringCta(true)}
                  onMouseLeave={() => setIsHoveringCta(false)}
                  onFocus={() => setIsHoveringCta(true)}
                  onBlur={() => setIsHoveringCta(false)}
                  disabled={state !== "idle"}
                >
                  Посмотреть, что внутри
                  <span aria-hidden="true">→</span>
                </button>
                {process.env.NODE_ENV === "development" && systemPrefersReducedMotion && !forceFullMotion ? (
                  <button
                    type="button"
                    className={styles.fullMotionButton}
                    onClick={() => startSequence(true)}
                    disabled={state !== "idle"}
                  >
                    Проиграть полную анимацию
                  </button>
                ) : null}
              </div>
            </div>

            <div className={`${styles.giftStage} ${isHoveringCta ? styles.ctaHover : ""}`}>
              <div className={styles.stageShadow} />
              <div className={styles.envelopeRig} aria-hidden="true">
                <div className={styles.openEnvelopeFlap} data-envelope-flap="true">
                  <div className={styles.envelopeFlapPlane}>
                    <div className={`${styles.envelopeFlapFace} ${styles.envelopeFlapOuterFace}`}>
                      <Image
                        className={`${styles.envelopeFlapArtwork} ${styles.envelopeFlapOuterArtwork}`}
                        src="/assets/gift/envelope-closed.png"
                        alt=""
                        fill
                        sizes="520px"
                        priority
                      />
                    </div>
                    <div className={`${styles.envelopeFlapFace} ${styles.envelopeFlapInnerFace}`}>
                      <Image
                        className={`${styles.envelopeFlapArtwork} ${styles.envelopeFlapInnerArtwork}`}
                        src="/assets/gift/envelope-open.png"
                        alt=""
                        fill
                        sizes="520px"
                        priority
                      />
                    </div>
                  </div>
                </div>
                <div className={styles.openEnvelopeBack}>
                  <Image src="/assets/gift/envelope-open.png" alt="" fill sizes="520px" priority />
                </div>

                <div
                  className={styles.letter}
                  data-visual-preset={resolvedVisualPreset}
                  data-photo-count={photos.length}
                  data-phrase-count={phrases.length}
                >
                  <div className={styles.letterEdge} />
                  <div className={styles.cardBase} data-fold-panel="lower">
                    <TemplateFoundation
                      templateId={templateId}
                      visualPreset={resolvedVisualPreset}
                      preset={previewPreset}
                      accent={accentColor}
                      decor={previewDecor}
                      className={styles.templateFoundationLower}
                    />
                  </div>

                  <div className={styles.cardLid} data-fold-panel="upper">
                    <div className={`${styles.cardLidFace} ${styles.cardLidOutside}`} data-card-face="address">
                      <LightweightCardPreview
                        recipientName={name}
                        fromLabel={fromLabel}
                        kicker={resolvedPreviewKicker}
                        templateId={templateId}
                        accent={accentColor}
                        preset={previewPreset}
                        decor={previewDecor}
                      />
                    </div>
                    <div className={`${styles.cardLidFace} ${styles.cardLidInside}`} data-card-face="template">
                      <TemplateFoundation
                        templateId={templateId}
                        visualPreset={resolvedVisualPreset}
                        preset={previewPreset}
                        accent={accentColor}
                        decor={previewDecor}
                        className={styles.templateFoundationUpper}
                      />
                    </div>
                  </div>

                  <div className={styles.assemblySurface}>
                    <TemplateFoundation
                      templateId={templateId}
                      visualPreset={resolvedVisualPreset}
                      accent={accentColor}
                      preset={previewPreset}
                      decor={previewDecor}
                    />

                    <div className={styles.assemblyContent}>
                      {assemblyEyebrow ? (
                        <div className={styles.templateIdentity}>
                          <span className={styles.templateOccasion}>{assemblyEyebrow}</span>
                          <strong className={styles.templateRecipient}>{name}</strong>
                          <span className={styles.templateFrom}>{fromLabel?.trim() || "С тёплыми словами"}</span>
                        </div>
                      ) : (
                        <>
                          <p className={styles.assemblyKicker}>Собрано из слов и моментов</p>
                          <strong className={styles.assemblyHeadline}>{headline}</strong>
                        </>
                      )}
                      <div className={styles.assemblyPhotos}>
                        {photos.map((photo, index) => (
                          <span key={photo.id} className={`${styles.assemblyPhoto} ${styles[`assemblyPhoto${index + 1}`]}`}>
                            <Image
                              src={photo.src}
                              alt={photo.alt}
                              fill
                              sizes="(max-width: 640px) 34vw, 170px"
                              style={{ objectPosition: photo.objectPosition }}
                            />
                          </span>
                        ))}
                      </div>
                      <div className={styles.assemblyPhrases}>
                        {phrases.map((phrase, index) => (
                          <span key={`${phrase}-${index}`} className={`${styles.assemblyPhrase} ${styles[`assemblyPhrase${index + 1}`]}`}>
                            {phrase}
                          </span>
                        ))}
                      </div>
                      {assemblyEyebrow ? (
                        <p className={styles.templateAssemblySummary}>{headline}</p>
                      ) : null}
                      <span className={styles.assemblySignature}>{fromLabel?.trim() || "С тёплыми словами"}</span>
                    </div>
                  </div>
                </div>

                <div className={styles.envelopePocketMask} data-envelope-pocket-mask="true" />
                <div className={styles.openEnvelopeFront}>
                  <Image
                    className={styles.envelopeFrontPocketArtwork}
                    src="/assets/gift/envelope-open.png"
                    alt=""
                    fill
                    sizes="520px"
                    priority
                  />
                </div>
                <div className={styles.envelopeSealArtwork} data-envelope-seal-artwork="true">
                  <Image src="/assets/gift/envelope-open.png" alt="" fill sizes="520px" priority />
                </div>
                <div className={styles.sealGlint} data-seal-glint="true" />
              </div>
              <button
                type="button"
                className={styles.envelopeTrigger}
                aria-label={`Открыть конверт для ${name}`}
                onClick={handleOpen}
                onMouseEnter={() => setIsHoveringCta(true)}
                onMouseLeave={() => setIsHoveringCta(false)}
                onFocus={() => setIsHoveringCta(true)}
                onBlur={() => setIsHoveringCta(false)}
                disabled={state !== "idle"}
              />
              <p className={styles.motionCaption} aria-live="polite">
                {state === "releasing-seal" ? "Освобождаем печать" : null}
                {state === "opening-envelope" ? "Открываем конверт" : null}
                {state === "extracting-card" ? "Достаём открытку" : null}
                {state === "unfolding-card" ? "Раскрываем открытку" : null}
                {state === "assembling-card" ? "Собираем подарок из слов и моментов" : null}
                {state === "handoff" ? "Открытка готова" : null}
              </p>
            </div>
          </div>
          )}
        </section>
      ) : null}
    </>
  );
};

export const GiftIntro = ({ variant = "assembled", ...props }: GiftIntroProps) => {
  if (variant === "legacy") {
    return (
      <LegacyGiftIntro
        recipientName={props.recipientName}
        subtitle={props.subtitle}
        fromLabel={props.fromLabel}
        previewKicker={props.previewKicker}
        previewPreset={props.previewPreset}
        previewDecor={props.previewDecor}
        templateId={props.templateId}
        animationId={props.animationId}
        accent={props.accent}
        onIntroDone={props.onIntroDone}
      >
        {props.children}
      </LegacyGiftIntro>
    );
  }

  return <GiftIntroAssembled {...props} variant={variant} />;
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
