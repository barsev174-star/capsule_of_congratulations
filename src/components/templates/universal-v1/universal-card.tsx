"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useId, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { startCardFromShowcaseAction } from "@/app/home-actions";
import { useScrollReveal } from "@/components/scroll-reveal/scroll-reveal";
import type { CardBlockReadinessView } from "@/lib/manage/card-design-readiness";
import {
  normalizedRectOverflows,
  universalTemplateBlockOrder,
  type NormalizedRect,
  type TemplateDecorLayer,
  type TemplateProfile,
  type UniversalPhotoFrame,
  type UniversalTemplateBlockId
} from "@/lib/templates/profile";
import {
  formatUniversalEventDate,
  getUniversalRenderedBlocks,
  type UniversalRenderedBlockId,
  type UniversalTemplateContribution,
  type UniversalTemplatePhoto,
  type UniversalTemplateSurface,
  type UniversalTemplateViewModel
} from "@/lib/templates/view-model";
import {
  getUniversalLayoutPreset,
  getUniversalMessageLayoutRule,
  getUniversalMessageScenarioForPhotoCount
} from "@/lib/templates/layout-presets";
import { getUniversalPhotoFramePreset } from "@/lib/templates/photo-frame-presets";
import { getUniversalTextCardPreset } from "@/lib/templates/text-card-presets";
import {
  getUniversalPhotoCaptionScale,
  getUniversalRecipientNameLines,
  getUniversalRecipientNameTier,
  getUniversalQuoteLengthScale,
  universalTextCapacityPresets
} from "@/lib/templates/text-capacity-presets";
import { getUnderlaySafeInsets } from "@/lib/templates/section-underlays";
import { SectionUnderlay } from "./section-underlay";
import { isUniversalBareSection } from "./section-presentation";
import styles from "./universal-card.module.css";

export type UniversalTemplateViewport = "auto" | "desktop" | "mobile";
export type UniversalTemplateActionContext = "demo" | "private" | "studio";

export type UniversalCardProps = {
  profile: TemplateProfile;
  model: UniversalTemplateViewModel;
  surface?: UniversalTemplateSurface;
  viewport?: UniversalTemplateViewport;
  actionContext?: UniversalTemplateActionContext;
  publicVersionHref?: string;
  manageToken?: string;
  blockReadiness?: CardBlockReadinessView[];
  debugSafeAreas?: boolean;
  className?: string;
};

const normalizedRectStyle = (rect: NormalizedRect): CSSProperties => ({
  left: `${rect.x * 100}%`,
  top: `${rect.y * 100}%`,
  width: `${rect.width * 100}%`,
  height: `${rect.height * 100}%`
});

const initials = (name: string) => name
  .split(/\s+/)
  .filter(Boolean)
  .slice(0, 2)
  .map((part) => part[0]?.toLocaleUpperCase("ru-RU"))
  .join("");

const getDecorVisibility = (
  layer: TemplateDecorLayer,
  viewport: UniversalTemplateViewport
) => {
  if (!layer.visibleOn || viewport === "auto") return true;
  return layer.visibleOn.includes(viewport);
};

function DecorLayers({
  profile,
  anchor,
  viewport
}: {
  profile: TemplateProfile;
  anchor: TemplateDecorLayer["anchor"];
  viewport: UniversalTemplateViewport;
}) {
  return profile.assets.decor
    .filter((layer) => layer.anchor === anchor && getDecorVisibility(layer, viewport) && layer.asset.src.startsWith("/"))
    .map((layer) => (
      <span
        key={layer.id}
        className={styles.decorLayer}
        data-decor-layer={layer.id}
        data-visible-on={layer.visibleOn?.join(" ")}
        style={{
          ...normalizedRectStyle(layer.rect),
          opacity: layer.opacity ?? 1,
          rotate: `${layer.rotation ?? 0}deg`
        }}
        aria-hidden="true"
      >
        <Image src={layer.asset.src} alt="" fill sizes="25vw" />
      </span>
    ));
}

function SectionSurface({
  id,
  dataBlockId = id,
  profile,
  viewport,
  className = "",
  children
}: {
  id: UniversalTemplateBlockId;
  dataBlockId?: UniversalRenderedBlockId;
  profile: TemplateProfile;
  viewport: UniversalTemplateViewport;
  className?: string;
  children: ReactNode;
}) {
  const isBare = isUniversalBareSection(id);
  const underlay = isBare ? undefined : profile.assets.sections[id];
  const surfaceColor = profile.colors.surfaces[id] ?? profile.colors.surface;
  const safeInsets = underlay ? getUnderlaySafeInsets(underlay) : null;
  const revealProps = useScrollReveal<HTMLElement>({
    disabled: !profile.motion?.revealSections
  });
  const hasOverflowDecor = profile.assets.decor.some((layer) =>
    layer.anchor === id &&
    getDecorVisibility(layer, viewport) &&
    layer.asset.src.startsWith("/") &&
    normalizedRectOverflows(layer.rect)
  );

  return (
    <section
      {...revealProps}
      className={`${styles.section} ${styles[id]} ${isBare ? styles.bareSection : ""} ${className}`.trim()}
      data-universal-block={dataBlockId}
      data-section-presentation={isBare ? "bare" : "surface"}
      data-underlay-preset={underlay?.preset}
      data-decor-overflow={hasOverflowDecor ? "visible" : undefined}
      data-motion-section={profile.motion?.revealSections ? "true" : undefined}
      style={{
        "--uv1-section-surface": surfaceColor,
        "--uv1-safe-top": safeInsets ? `${safeInsets.top * 100}cqw` : "0px",
        "--uv1-safe-right": safeInsets ? `${safeInsets.right * 100}cqw` : "0px",
        "--uv1-safe-bottom": safeInsets ? `${safeInsets.bottom * 100}cqw` : "0px",
        "--uv1-safe-left": safeInsets ? `${safeInsets.left * 100}cqw` : "0px"
      } as CSSProperties}
    >
      {underlay ? <SectionUnderlay underlay={underlay} className={styles.sectionUnderlay} /> : null}
      <DecorLayers profile={profile} anchor={id} viewport={viewport} />
      <div className={styles.sectionContent} data-section-content>{children}</div>
      {underlay ? <><span className={styles.underlayGuide}><b>подложка</b></span><span className={styles.textSafeGuide}><b>safe text</b></span></> : null}
    </section>
  );
}

function UniversalPhoto({
  photo,
  frame,
  priority = false,
  className = "",
  onOpen
}: {
  photo: UniversalTemplatePhoto;
  frame: UniversalPhotoFrame;
  priority?: boolean;
  className?: string;
  onOpen?: (photoId: string, trigger: HTMLButtonElement) => void;
}) {
  const framePreset = getUniversalPhotoFramePreset(frame.preset);
  const captionStyle = {
    ...normalizedRectStyle(framePreset.captionArea),
    "--uv1-caption-scale": getUniversalPhotoCaptionScale(photo.caption, frame.caption.minScale)
  } as CSSProperties;
  const apertureStyle = normalizedRectStyle(framePreset.aperture);
  const photoImage = <Image
    src={photo.src}
    alt={photo.alt}
    fill
    priority={priority}
    sizes="(max-width: 640px) 88vw, 42vw"
    style={{
      objectFit: "cover",
      objectPosition: `${photo.crop.x * 100}% ${photo.crop.y * 100}%`,
      transform: `scale(${photo.crop.zoom})`,
      transformOrigin: `${photo.crop.x * 100}% ${photo.crop.y * 100}%`
    }}
  />;

  return (
    <figure
      className={`${styles.photoFrame} ${className}`.trim()}
      style={{ aspectRatio: framePreset.aspectRatio }}
      data-photo-frame
    >
      {frame.base ? <Image className={styles.frameBase} src={frame.base.src} alt="" fill sizes="40vw" aria-hidden="true" /> : null}
      {onOpen ? (
        <button
          type="button"
          className={styles.photoAperture}
          style={apertureStyle}
          data-photo-aperture
          data-photo-open
          aria-label={`Открыть фотографию: ${photo.caption}`}
          onClick={(event) => onOpen(photo.id, event.currentTarget)}
        >
          {photoImage}
        </button>
      ) : <span className={styles.photoAperture} style={apertureStyle} data-photo-aperture>{photoImage}</span>}
      {frame.overlay ? <Image className={styles.frameOverlay} src={frame.overlay.src} alt="" fill sizes="40vw" aria-hidden="true" /> : null}
      <figcaption
        className={`${styles.photoCaption} ${styles[`caption${frame.caption.align[0].toUpperCase()}${frame.caption.align.slice(1)}`]} ${frame.caption.fontToken === "handwritten" ? styles.handwrittenCaption : ""}`.trim()}
        style={captionStyle}
        data-safe-text
        data-text-boundary
        data-text-preset="photo-caption"
        data-max-lines={universalTextCapacityPresets.photoCaption.maxLines}
        data-photo-caption-area
        title={photo.caption}
      >
        <span>{photo.caption}</span>
      </figcaption>
    </figure>
  );
}

const fitCompactMessage = (value: string, maxChars: number) => {
  const normalized = value.trim();
  if (normalized.length <= maxChars) return normalized;
  const candidate = normalized.slice(0, Math.max(1, maxChars - 1)).trimEnd();
  const lastSpace = candidate.lastIndexOf(" ");
  const fitted = lastSpace >= Math.floor(candidate.length * .72) ? candidate.slice(0, lastSpace) : candidate;
  return `${fitted.trimEnd()}…`;
};

function MessageCard({ contribution, index, profile, carouselOrder, maxChars = universalTextCapacityPresets.messageCard.maxChars, expanded = false }: {
  contribution: UniversalTemplateContribution;
  index: number;
  profile: TemplateProfile;
  carouselOrder?: number;
  maxChars?: number;
  expanded?: boolean;
}) {
  const underlay = profile.assets.greetingCards[index % profile.assets.greetingCards.length];
  const safeInsets = underlay ? getUnderlaySafeInsets(underlay) : null;
  const cardStyle = {
    ...(safeInsets ? {
      "--uv1-message-safe-top": `${safeInsets.top * 100}cqw`,
      "--uv1-message-safe-right": `${safeInsets.right * 100}cqw`,
      "--uv1-message-safe-bottom": `${safeInsets.bottom * 100}cqw`,
      "--uv1-message-safe-left": `${safeInsets.left * 100}cqw`
    } : {}),
    ...(carouselOrder !== undefined ? { "--uv1-desktop-carousel-order": carouselOrder } : {})
  } as CSSProperties;
  const compactMessage = fitCompactMessage(contribution.message, maxChars);
  const message = expanded ? contribution.message : compactMessage;
  const density = message.length > 240 ? "dense" : message.length > 160 ? "compact" : "default";
  return (
    <article
      className={styles.messageCard}
      data-message-card
      data-message-expanded={expanded || undefined}
      data-message-over-limit={!expanded && contribution.message.trim().length > maxChars || undefined}
      data-message-density={density}
      data-greeting-card-index={underlay ? index % profile.assets.greetingCards.length : undefined}
      style={cardStyle}
    >
      {underlay ? <SectionUnderlay underlay={underlay} className={styles.messageCardUnderlay} /> : null}
      <div className={styles.messageCardContent}>
        <header className={styles.messageAuthor}>
          {expanded && contribution.avatarUrl ? (
            <span className={styles.avatarImage}><Image src={contribution.avatarUrl} alt="" fill sizes="44px" /></span>
          ) : expanded ? <span className={styles.avatarFallback} aria-hidden="true">{initials(contribution.authorName)}</span> : null}
          <span><strong>{contribution.authorName}</strong>{contribution.authorRole ? <small>{contribution.authorRole}</small> : null}</span>
        </header>
        <p
          data-safe-text
          data-text-boundary
          data-text-preset="message-card"
          data-max-chars={maxChars}
          title={contribution.message}
        >{message}</p>
      </div>
    </article>
  );
}

function AllMessagesDialog({
  open,
  onClose,
  contributions,
  profile,
  viewport
}: {
  open: boolean;
  onClose: () => void;
  contributions: readonly UniversalTemplateContribution[];
  profile: TemplateProfile;
  viewport: UniversalTemplateViewport;
}) {
  const titleId = useId();
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const dialogTheme = {
    "--uv1-text": profile.colors.text,
    "--uv1-muted": profile.colors.muted,
    "--uv1-accent": profile.colors.accent,
    "--uv1-surface": profile.colors.surface,
    "--uv1-heading-font": profile.typography.heading.family,
    "--uv1-body-font": profile.typography.body.family
  } as CSSProperties;

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeButtonRef.current?.focus({ preventScroll: true });
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [onClose, open]);

  if (!open) return null;
  return createPortal(
    <div className={styles.dialogBackdrop} data-template-id={profile.id} data-motion-preset={profile.motion?.preset ?? "calm"} data-viewport={viewport} role="presentation" onMouseDown={(event) => {
      if (event.target === event.currentTarget) onClose();
    }} style={dialogTheme}>
      <section className={styles.messagesDialog} role="dialog" aria-modal="true" aria-labelledby={titleId}>
        <header><div><span>Полная подборка</span><h2 id={titleId}>Все поздравления</h2></div><button ref={closeButtonRef} type="button" onClick={onClose} aria-label="Закрыть все поздравления">×</button></header>
        <div className={styles.dialogMessages}>{contributions.map((contribution, index) => <MessageCard key={contribution.id} contribution={contribution} index={index} profile={profile} expanded />)}</div>
      </section>
    </div>,
    document.body
  );
}

function PhotoViewerDialog({
  activePhotoId,
  photos,
  profile,
  viewport,
  onClose,
  onSelect
}: {
  activePhotoId: string | null;
  photos: readonly UniversalTemplatePhoto[];
  profile: TemplateProfile;
  viewport: UniversalTemplateViewport;
  onClose: () => void;
  onSelect: (photoId: string) => void;
}) {
  const titleId = useId();
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const pointerStartXRef = useRef<number | null>(null);
  const activeIndex = photos.findIndex((photo) => photo.id === activePhotoId);
  const activePhoto = activeIndex >= 0 ? photos[activeIndex] : null;
  const dialogTheme = {
    "--uv1-page": profile.colors.page,
    "--uv1-text": profile.colors.text,
    "--uv1-muted": profile.colors.muted,
    "--uv1-accent": profile.colors.accent,
    "--uv1-surface": profile.colors.surface,
    "--uv1-heading-font": profile.typography.heading.family,
    "--uv1-body-font": profile.typography.body.family
  } as CSSProperties;
  const selectOffset = (offset: number) => {
    if (photos.length < 2 || activeIndex < 0) return;
    const nextIndex = (activeIndex + offset + photos.length) % photos.length;
    onSelect(photos[nextIndex].id);
  };

  useEffect(() => {
    if (!activePhoto) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeButtonRef.current?.focus({ preventScroll: true });
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
      if (event.key === "ArrowLeft" && photos.length > 1) {
        event.preventDefault();
        onSelect(photos[(activeIndex - 1 + photos.length) % photos.length].id);
      }
      if (event.key === "ArrowRight" && photos.length > 1) {
        event.preventDefault();
        onSelect(photos[(activeIndex + 1) % photos.length].id);
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [activeIndex, activePhoto, onClose, onSelect, photos]);

  if (!activePhoto) return null;
  return createPortal(
    <div
      className={styles.photoDialogBackdrop}
      data-template-id={profile.id}
      data-motion-preset={profile.motion?.preset ?? "calm"}
      data-viewport={viewport}
      role="presentation"
      style={dialogTheme}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section className={styles.photoDialog} role="dialog" aria-modal="true" aria-labelledby={titleId} data-photo-viewer>
        <header>
          <div><span>Фотография</span><h2 id={titleId} aria-live="polite">{activePhoto.caption}</h2></div>
          <button ref={closeButtonRef} type="button" onClick={onClose} aria-label="Закрыть просмотр фотографии">×</button>
        </header>
        <div
          className={styles.photoDialogStage}
          onPointerDown={(event) => {
            if (event.pointerType === "touch" || event.pointerType === "pen") pointerStartXRef.current = event.clientX;
          }}
          onPointerCancel={() => { pointerStartXRef.current = null; }}
          onPointerUp={(event) => {
            const startX = pointerStartXRef.current;
            pointerStartXRef.current = null;
            if (startX === null || photos.length < 2) return;
            const distance = event.clientX - startX;
            if (Math.abs(distance) >= 48) selectOffset(distance < 0 ? 1 : -1);
          }}
        >
          <Image src={activePhoto.src} alt={activePhoto.alt} fill sizes="(max-width: 640px) 100vw, 88vw" priority style={{ objectFit: "contain" }} />
        </div>
        <footer>
          <span>{activeIndex + 1} из {photos.length}</span>
          {photos.length > 1 ? <div>
            <button type="button" onClick={() => selectOffset(-1)} aria-label="Предыдущая фотография">‹</button>
            <button type="button" onClick={() => selectOffset(1)} aria-label="Следующая фотография">›</button>
          </div> : null}
        </footer>
      </section>
    </div>,
    document.body
  );
}

function MessagesBlock({
  profile,
  model,
  viewport,
  onPhotoOpen
}: {
  profile: TemplateProfile;
  model: UniversalTemplateViewModel;
  viewport: UniversalTemplateViewport;
  onPhotoOpen?: (photoId: string, trigger: HTMLButtonElement) => void;
}) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const dialogTriggerRef = useRef<HTMLButtonElement | null>(null);
  const scrollPositionRef = useRef(0);
  const layoutPreset = getUniversalLayoutPreset(profile.layoutPreset);
  const scenario = getUniversalMessageScenarioForPhotoCount(
    profile.layoutPreset,
    model.messagePhotos.length,
    model.messageScenario
  );
  const layoutRule = getUniversalMessageLayoutRule(profile.layoutPreset, scenario);
  const visibleCardCount = layoutRule.cardsPerPage;
  const hasMedia = model.messagePhotos.length > 0;
  const visibleContributions = model.contributions;
  const noMediaCarouselRows = scenario === "carousel-1" ? 1 : 2;
  const noMediaCarouselColumns = scenario === "grid-2" ? 2 : 3;
  const getNoMediaCarouselOrder = (index: number) => {
    const pageSize = noMediaCarouselRows * noMediaCarouselColumns;
    const page = Math.floor(index / pageSize);
    const position = index % pageSize;
    const row = Math.floor(position / noMediaCarouselColumns);
    const column = position % noMediaCarouselColumns;
    return page * pageSize + column * noMediaCarouselRows + row;
  };
  const openDialog = (trigger: HTMLButtonElement) => {
    dialogTriggerRef.current = trigger;
    scrollPositionRef.current = window.scrollY;
    setDialogOpen(true);
  };
  const closeDialog = () => {
    setDialogOpen(false);
    window.requestAnimationFrame(() => {
      if (window.scrollY !== scrollPositionRef.current) window.scrollTo(0, scrollPositionRef.current);
      dialogTriggerRef.current?.focus({ preventScroll: true });
    });
  };

  return (
    <>
      <div className={styles.sectionHeadingRow} data-has-media={hasMedia ? "true" : "false"}>
        <h2>Поздравления</h2>
        <button
          type="button"
          className={`${styles.countBadge} ${styles.allMessagesButton}`}
          aria-label={`${model.participantCount} поздравлений`}
          title="Открыть все поздравления"
          onClick={(event) => openDialog(event.currentTarget)}
        ><strong>{model.participantCount}</strong> поздравлений</button>
      </div>
      <div
        className={styles.messagesComposition}
        data-message-scenario={scenario}
        data-media-distribution={layoutRule.mediaDistribution}
        data-has-media={hasMedia || undefined}
        style={{
          "--uv1-message-stack-height": `${visibleCardCount * layoutPreset.geometry.messageCardHeight + (visibleCardCount - 1) * layoutPreset.geometry.messageGap}px`
        } as CSSProperties}
      >
        {hasMedia ? <div className={styles.messagePhotoGrid} data-motion-stagger>{model.messagePhotos.map((photo, index) => {
          const usePortraitFrame = layoutRule.photoFrame === "portrait";
          return <UniversalPhoto
            key={photo.id}
            className={styles[`messagePhoto${index + 1}`]}
            photo={photo}
            frame={usePortraitFrame ? profile.assets.photoFrames.messagePortrait : profile.assets.photoFrames.messageLandscape}
            priority={index === 0}
            onOpen={onPhotoOpen}
          />;
        })}</div> : null}
        <div className={styles.messageGrid} data-message-layout={hasMedia ? "media-stack" : "no-media-carousel"} data-carousel-rows={!hasMedia ? noMediaCarouselRows : undefined} data-carousel-columns={!hasMedia ? noMediaCarouselColumns : undefined} data-visible-card-count={visibleCardCount} data-motion-stagger>{visibleContributions.map((contribution, index) => <MessageCard key={contribution.id} contribution={contribution} index={index} profile={profile} maxChars={layoutRule.maxChars} carouselOrder={!hasMedia ? getNoMediaCarouselOrder(index) : undefined} />)}</div>
      </div>
      <button
        type="button"
        className={`${styles.allMessagesButton} ${styles.mobileAllMessagesButton}`}
        onClick={(event) => openDialog(event.currentTarget)}
      ><span>Посмотреть все <strong>{model.participantCount}</strong> поздравлений</span></button>
      <AllMessagesDialog
        open={dialogOpen}
        onClose={closeDialog}
        contributions={model.contributions}
        profile={profile}
        viewport={viewport}
      />
    </>
  );
}

function MemoriesBlock({
  profile,
  model,
  onPhotoOpen
}: {
  profile: TemplateProfile;
  model: UniversalTemplateViewModel;
  onPhotoOpen?: (photoId: string, trigger: HTMLButtonElement) => void;
}) {
  const [primary, second, third] = model.memoryPhotos;
  if (!primary || !second || !third) return null;

  return (
    <div className={styles.memoriesLayout} data-memories-layout="route-strip">
      <div className={styles.memoriesPhotos} data-memory-photo-row data-motion-stagger>
        <UniversalPhoto className={styles.memoryPrimary} photo={primary} frame={profile.assets.photoFrames.memory} priority onOpen={onPhotoOpen} />
        <div className={styles.memoriesIntro}><h2>{model.memoryTitle}</h2><p>{model.memoryDescription}</p></div>
        <UniversalPhoto className={styles.memorySecondary} photo={second} frame={profile.assets.photoFrames.memory} onOpen={onPhotoOpen} />
        <UniversalPhoto className={styles.memoryTertiary} photo={third} frame={profile.assets.photoFrames.memory} onOpen={onPhotoOpen} />
      </div>
    </div>
  );
}

function ClosingActions({
  context,
  publicVersionHref
}: {
  context: UniversalTemplateActionContext;
  publicVersionHref?: string;
}) {
  const createButton = (
    <button type="submit" className={`${styles.closingAction} ${styles.closingActionPrimary}`}>
      Создать такую же открытку
    </button>
  );
  const publicVersionButton = publicVersionHref ? (
    <a href={publicVersionHref} className={`${styles.closingAction} ${styles.closingActionSecondary}`}>
      Настроить публичную версию
    </a>
  ) : (
    <button type="button" className={`${styles.closingAction} ${styles.closingActionSecondary}`}>
      Настроить публичную версию
    </button>
  );

  return (
    <div className={styles.closingActions} data-action-context={context}>
      {context === "studio" ? createButton : <form action={startCardFromShowcaseAction}>{createButton}</form>}
      {context === "private" || context === "studio" ? publicVersionButton : null}
    </div>
  );
}

function ClosingBrand() {
  return (
    <div className={styles.closingBrand}>
      <Link href="/">Создано в Slovesto</Link>
      <small>Место, где слова становятся подарком</small>
    </div>
  );
}

function ReadinessPlaceholder({
  readiness,
  manageToken
}: {
  readiness: CardBlockReadinessView;
  manageToken?: string;
}) {
  const actionHref = readiness.action && manageToken
    ? readiness.action.kind === "tab"
      ? `/manage/${manageToken}?tab=${readiness.action.target}`
      : `/manage/${manageToken}#${readiness.action.target}`
    : null;

  return (
    <section
      className={`${styles.section} ${styles.previewBlockPlaceholder}`}
      data-universal-block={readiness.blockId}
      data-block-readiness={readiness.status}
    >
      <span className={styles.previewBlockPlaceholderBadge}>Требует настройки</span>
      <h2>{readiness.title}</h2>
      <p>{readiness.explanation}</p>
      {actionHref && readiness.action ? (
        <Link href={actionHref} className={styles.previewBlockPlaceholderAction}>
          {readiness.action.label}
        </Link>
      ) : null}
    </section>
  );
}

export function UniversalTemplateCard({
  profile,
  model,
  surface = "private",
  viewport = "auto",
  actionContext,
  publicVersionHref,
  manageToken,
  blockReadiness = [],
  debugSafeAreas = false,
  className = ""
}: UniversalCardProps) {
  const contentBlocks = getUniversalRenderedBlocks(model, surface);
  const readinessByBlock = new Map(blockReadiness.map((item) => [item.blockId, item]));
  const blocks: UniversalRenderedBlockId[] = surface === "private" && blockReadiness.length > 0
    ? universalTemplateBlockOrder.filter((blockId) => {
        const readiness = readinessByBlock.get(blockId);
        return readiness ? readiness.enabled : contentBlocks.includes(blockId);
      })
    : contentBlocks;
  const layoutPreset = getUniversalLayoutPreset(profile.layoutPreset);
  const eventDate = formatUniversalEventDate(model.eventDate);
  const quotes = surface === "private" ? model.privateQuotes : model.publicQuotes;
  const privatePhotoCount = model.privatePhotoCount ?? model.messagePhotos.length + model.memoryPhotos.length;
  const photoCount = surface === "public" ? model.publicPhotoCount : privatePhotoCount;
  const resolvedActionContext = actionContext ?? (surface === "private" ? "private" : "demo");
  const recipientNameTier = getUniversalRecipientNameTier(model.recipientName);
  const recipientNameLines = getUniversalRecipientNameLines(model.recipientName);
  const photoViewerEnabled = profile.motion?.photoViewer ?? false;
  const [activePhotoId, setActivePhotoId] = useState<string | null>(null);
  const photoTriggerRef = useRef<HTMLButtonElement | null>(null);
  const viewerPhotos = useMemo(() => {
    const photos = surface === "public" ? model.memoryPhotos : [...model.messagePhotos, ...model.memoryPhotos];
    return Array.from(new Map(photos.map((photo) => [photo.id, photo])).values());
  }, [model.memoryPhotos, model.messagePhotos, surface]);
  const openPhotoViewer = useCallback((photoId: string, trigger: HTMLButtonElement) => {
    photoTriggerRef.current = trigger;
    setActivePhotoId(photoId);
  }, [setActivePhotoId]);
  const closePhotoViewer = useCallback(() => {
    setActivePhotoId(null);
    window.requestAnimationFrame(() => photoTriggerRef.current?.focus({ preventScroll: true }));
  }, [setActivePhotoId]);
  const rootStyle = {
    "--uv1-page": profile.colors.page,
    "--uv1-text": profile.colors.text,
    "--uv1-muted": profile.colors.muted,
    "--uv1-accent": profile.colors.accent,
    "--uv1-surface": profile.colors.surface,
    "--uv1-heading-font": profile.typography.heading.family,
    "--uv1-heading-weight": profile.typography.heading.weight,
    "--uv1-body-font": profile.typography.body.family,
    "--uv1-body-weight": profile.typography.body.weight,
    "--uv1-handwritten-font": profile.typography.handwritten.family,
    "--uv1-handwritten-weight": profile.typography.handwritten.weight,
    "--uv1-counter-congratulations-text": profile.export.counters?.congratulations.text ?? profile.colors.muted,
    "--uv1-counter-congratulations-surface": profile.export.counters?.congratulations.surface ?? profile.colors.surface,
    "--uv1-counter-congratulations-outline": profile.export.counters?.congratulations.outline ?? profile.colors.text,
    "--uv1-counter-photos-text": profile.export.counters?.photos.text ?? profile.colors.muted,
    "--uv1-counter-photos-surface": profile.export.counters?.photos.surface ?? profile.colors.surface,
    "--uv1-counter-photos-outline": profile.export.counters?.photos.outline ?? profile.colors.text,
    "--uv1-shell-max-width": `${layoutPreset.geometry.shellMaxWidth}px`,
    "--uv1-shell-padding-max": `${layoutPreset.geometry.shellPaddingMax}px`,
    "--uv1-section-gap": `${layoutPreset.geometry.sectionGap}px`,
    "--uv1-section-radius": `${layoutPreset.geometry.sectionRadius}px`,
    "--uv1-section-padding-max": `${layoutPreset.geometry.sectionPaddingMax}px`,
    "--uv1-section-heading-max": `${layoutPreset.geometry.sectionHeadingMax}px`,
    "--uv1-hero-min-height": `${layoutPreset.geometry.heroMinHeight}px`,
    "--uv1-hero-padding": `${layoutPreset.geometry.heroPadding}px`,
    "--uv1-recipient-name-max": `${layoutPreset.geometry.recipientNameMax}px`,
    "--uv1-recipient-name-long-max": `${layoutPreset.geometry.recipientNameLongMax}px`,
    "--uv1-summary-content-max-width": `${layoutPreset.geometry.summaryContentMaxWidth}px`,
    "--uv1-summary-padding-block": `${layoutPreset.geometry.summaryPaddingBlock}px`,
    "--uv1-summary-padding-inline": `${layoutPreset.geometry.summaryPaddingInline}px`,
    "--uv1-qualities-padding-top": `${layoutPreset.geometry.qualitiesPaddingTop}px`,
    "--uv1-qualities-padding-bottom": `${layoutPreset.geometry.qualitiesPaddingBottom}px`,
    "--uv1-qualities-padding-inline": `${layoutPreset.geometry.qualitiesPaddingInline}px`,
    "--uv1-quality-card-height": `${layoutPreset.geometry.qualityCardHeight}px`,
    "--uv1-quality-font-max": `${layoutPreset.geometry.qualityFontMax}px`,
    "--uv1-messages-padding-block": `${layoutPreset.geometry.messagesPaddingBlock}px`,
    "--uv1-messages-padding-inline": `${layoutPreset.geometry.messagesPaddingInline}px`,
    "--uv1-message-card-height": `${layoutPreset.geometry.messageCardHeight}px`,
    "--uv1-message-gap": `${layoutPreset.geometry.messageGap}px`,
    "--uv1-message-text-font-max": `${layoutPreset.geometry.messageTextFontMax}px`,
    "--uv1-message-trio-photo-width": `${layoutPreset.geometry.messageTrioPhotoWidthPercent}%`,
    "--uv1-photo-caption-font-max": `${layoutPreset.geometry.photoCaptionFontMax}px`,
    "--uv1-handwritten-photo-caption-font-max": `${layoutPreset.geometry.handwrittenPhotoCaptionFontMax}px`,
    "--uv1-memory-caption-font-max": `${layoutPreset.geometry.memoryCaptionFontMax}px`,
    "--uv1-photo-caption-inline-padding": `${layoutPreset.geometry.photoCaptionInlinePaddingPercent}%`,
    "--uv1-quotes-padding-block": `${layoutPreset.geometry.quotesPaddingBlock}px`,
    "--uv1-quotes-heading-gap": `${layoutPreset.geometry.quotesHeadingGap}px`,
    "--uv1-quotes-heading-inline": `${layoutPreset.geometry.quotesHeadingInline}px`,
    "--uv1-quote-card-height": `${layoutPreset.geometry.quoteCardHeight}px`,
    "--uv1-quote-text-font-max": `${layoutPreset.geometry.quoteTextFontMax}px`,
    "--uv1-closing-height": `${layoutPreset.geometry.closingHeight}px`,
    "--uv1-closing-font-max": `${layoutPreset.geometry.closingFontMax}px`
  } as CSSProperties;

  return (
    <main
      className={`${styles.page} ${debugSafeAreas ? styles.debugSafeAreas : ""} ${className}`.trim()}
      data-template-family="universal-v1"
      data-template-id={profile.id}
      data-layout-preset={profile.layoutPreset}
      data-surface={surface}
      data-viewport={viewport}
      data-motion-preset={profile.motion?.preset ?? "calm"}
      data-counter-preset={profile.export.counters?.preset}
      data-photo-viewer-enabled={photoViewerEnabled ? "true" : undefined}
      style={rootStyle}
    >
      {profile.assets.page ? <span className={styles.pageAsset} aria-hidden="true" style={{ backgroundImage: `url(${profile.assets.page.src})` }} /> : null}
      <DecorLayers profile={profile} anchor="templateRoot" viewport={viewport} />
      <div className={styles.shell}>
        {blocks.map((block) => {
          const readiness = block === "public-note" ? undefined : readinessByBlock.get(block);
          if (surface === "private" && readiness && readiness.status !== "READY") {
            return <ReadinessPlaceholder key={block} readiness={readiness} manageToken={manageToken} />;
          }

          if (block === "hero") return <SectionSurface key={block} id="hero" profile={profile} viewport={viewport} className={styles.heroSection}>
            {model.occasion ? <span className={styles.heroOccasion}>{model.occasion}</span> : null}
            {eventDate ? <time className={styles.eventDate} dateTime={model.eventDate ?? undefined}>{eventDate}</time> : null}
            <div
              className={styles.recipientNameBoundary}
              data-safe-text
              data-text-boundary
              data-text-preset="recipient-name"
              data-max-lines={universalTextCapacityPresets.recipientName.maxLines}
              title={model.recipientName}
            >
              <h1
                className={`${styles.recipientName} ${recipientNameTier === "long" ? styles.recipientNameLong : ""} ${recipientNameTier === "very-long" ? styles.recipientNameVeryLong : ""}`.trim()}
                aria-label={model.recipientName}
              >{recipientNameLines.map((line) => <span key={line}>{line}</span>)}</h1>
            </div>
            <p className={styles.heroDescription}>{model.heroDescription}</p>
            <div className={styles.heroStats}>{model.participantCount > 0 ? <span data-hero-stat="congratulations"><strong>{model.participantCount}</strong> поздравлений</span> : null}{photoCount && photoCount > 0 ? <span data-hero-stat="photos"><strong>{photoCount}</strong> фото</span> : null}</div>
          </SectionSurface>;

          if (block === "summary") return <SectionSurface key={block} id="summary" profile={profile} viewport={viewport}>
            <h2>{model.summaryTitle}</h2><p className={styles.mainGreeting}>{model.mainGreeting}</p>{model.mainGreetingAuthorName ? <p className={styles.summaryAuthor}>— {model.mainGreetingAuthorName}</p> : null}
          </SectionSurface>;

          if (block === "qualities") return <SectionSurface key={block} id="qualities" profile={profile} viewport={viewport}>
            <h2>За что тебя ценят</h2><div className={styles.qualitiesGrid} data-motion-stagger>{model.qualities.map((quality, index) => {
              const card = profile.assets.qualityCards[index % Math.max(1, profile.assets.qualityCards.length)];
              const preset = card ? getUniversalTextCardPreset(card.preset) : null;
              const textStyle = preset
                ? { ...normalizedRectStyle(preset.textArea), ...(card?.textColor ? { color: card.textColor } : {}) }
                : undefined;
              return <article key={`${quality}-${index}`} className={styles.qualityCard} data-text-card data-text-card-rendering={preset?.rendering}>{card ? <Image src={card.asset.src} alt="" fill sizes="18vw" aria-hidden="true" /> : null}<strong data-safe-text data-text-boundary data-text-preset="quality-card" data-max-lines={universalTextCapacityPresets.qualityCard.maxLines} style={textStyle} title={quality}><span>{quality}</span></strong></article>;
            })}</div>
          </SectionSurface>;

          if (block === "messages") return <SectionSurface key={block} id="messages" profile={profile} viewport={viewport}><MessagesBlock profile={profile} model={model} viewport={viewport} onPhotoOpen={photoViewerEnabled ? openPhotoViewer : undefined} /></SectionSurface>;

          if (block === "memories") return <SectionSurface key={block} id="memories" profile={profile} viewport={viewport}><MemoriesBlock profile={profile} model={model} onPhotoOpen={photoViewerEnabled ? openPhotoViewer : undefined} /></SectionSurface>;

          if (block === "quotes") return <SectionSurface key={block} id="quotes" profile={profile} viewport={viewport}>
            <h2>Лучшие фразы</h2><div className={styles.quotesGrid} data-motion-stagger>{quotes.slice(0, 3).map((quote, index) => {
              const card = profile.assets.quoteCards[index % Math.max(1, profile.assets.quoteCards.length)];
              const preset = card ? getUniversalTextCardPreset(card.preset) : null;
              const quoteStyle = {
                ...(preset ? normalizedRectStyle(preset.textArea) : {}),
                "--uv1-quote-scale": getUniversalQuoteLengthScale(quote)
              } as CSSProperties;
              return <blockquote key={`${quote}-${index}`} className={styles.quoteCard} data-text-card data-text-card-rendering={preset?.rendering}>{card ? <Image src={card.asset.src} alt="" fill sizes="28vw" aria-hidden="true" /> : null}{preset?.renderLeadingQuote !== false ? <span aria-hidden="true">“</span> : null}<p data-safe-text data-text-boundary data-text-preset="quote-card" data-max-lines={universalTextCapacityPresets.quoteCard.maxLines} style={quoteStyle} title={quote}>{quote}</p></blockquote>;
            })}</div>
          </SectionSurface>;

          if (block === "closing") return <SectionSurface key={block} id="closing" profile={profile} viewport={viewport} className={styles.closingSection}><p className={styles.closingSignature}>{model.privateSignature}</p><ClosingActions context={resolvedActionContext} publicVersionHref={publicVersionHref} /><ClosingBrand /></SectionSurface>;

          return <SectionSurface key={block} id="closing" dataBlockId="public-note" profile={profile} viewport={viewport} className={`${styles.closingSection} ${styles.publicNote}`}><h2>В полной открытке — ещё больше тепла</h2><p>Личные поздравления и важные воспоминания бережно сохранены только для получателя.</p><ClosingActions context={resolvedActionContext} publicVersionHref={publicVersionHref} /><ClosingBrand /></SectionSurface>;
        })}
      </div>
      {photoViewerEnabled ? <PhotoViewerDialog
        activePhotoId={activePhotoId}
        photos={viewerPhotos}
        profile={profile}
        viewport={viewport}
        onClose={closePhotoViewer}
        onSelect={setActivePhotoId}
      /> : null}
    </main>
  );
}
