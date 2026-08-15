/* eslint-disable @next/next/no-img-element, jsx-a11y/alt-text -- The component is rasterized by ImageResponse. */
import type { CSSProperties, ReactNode } from "react";
import {
  normalizedRectOverflows,
  type NormalizedRect,
  type TemplateAssetRef,
  type TemplateDecorLayer,
  type TemplateProfile,
  type UniversalPhotoFrame,
  type UniversalTemplateBlockId
} from "@/lib/templates/profile";
import {
  formatUniversalEventDate,
  type UniversalTemplatePhoto,
  type UniversalTemplateViewModel
} from "@/lib/templates/view-model";
import { getUnderlaySafeInsets } from "@/lib/templates/section-underlays";
import { getUniversalPhotoFramePreset } from "@/lib/templates/photo-frame-presets";
import { getUniversalTextCardPreset } from "@/lib/templates/text-card-presets";
import {
  getUniversalRecipientNameTier
} from "@/lib/templates/text-capacity-presets";
import { SectionUnderlay } from "./section-underlay";
import { isUniversalBareSection } from "./section-presentation";

export const universalExportFormats = {
  story: { width: 1080, height: 1920, phraseCount: 2, photoCount: 3 },
  post: { width: 1080, height: 1350, phraseCount: 3, photoCount: 2 },
  a4: { width: 1240, height: 1754, phraseCount: 3, photoCount: 3 }
} as const;

export type UniversalExportFormat = keyof typeof universalExportFormats;

type UniversalExportCardProps = {
  profile: TemplateProfile;
  model: UniversalTemplateViewModel;
  format: UniversalExportFormat;
  resolveAsset?: (src: `/${string}`) => string;
  resolvePhoto?: (src: `/${string}`) => string;
};

type FormatLayout = {
  padding: number;
  verticalPadding: number;
  gap: number;
  hero: number;
  qualities: number;
  moments: number;
  quotes: number;
  closing: number;
  heading: number;
  body: number;
};

const layouts: Record<UniversalExportFormat, FormatLayout> = {
  story: { padding: 28, verticalPadding: 10, gap: 8, hero: 380, qualities: 270, moments: 650, quotes: 270, closing: 289, heading: 44, body: 25 },
  post: { padding: 24, verticalPadding: 12, gap: 5, hero: 210, qualities: 220, moments: 470, quotes: 175, closing: 216, heading: 39, body: 20 },
  a4: { padding: 38, verticalPadding: 18, gap: 6, hero: 310, qualities: 235, moments: 650, quotes: 220, closing: 268, heading: 43, body: 22 }
};

const rectStyle = (rect: NormalizedRect): CSSProperties => ({
  left: `${rect.x * 100}%`,
  top: `${rect.y * 100}%`,
  width: `${rect.width * 100}%`,
  height: `${rect.height * 100}%`
});

const exportVisible = (layer: TemplateDecorLayer) => !layer.visibleOn || layer.visibleOn.includes("export");

function Decor({
  profile,
  anchor,
  resolveAsset
}: {
  profile: TemplateProfile;
  anchor: TemplateDecorLayer["anchor"];
  resolveAsset: (src: `/${string}`) => string;
}) {
  return <>{profile.assets.decor.filter((layer) => layer.anchor === anchor && exportVisible(layer) && layer.asset.src.startsWith("/")).map((layer) => (
    <div key={layer.id} data-decor-layer={layer.id} style={{ position: "absolute", display: "flex", ...rectStyle(layer.rect), opacity: layer.opacity ?? 1, transform: `rotate(${layer.rotation ?? 0}deg)` }}>
      <img src={resolveAsset(layer.asset.src)} style={{ width: "100%", height: "100%", objectFit: "contain" }} />
    </div>
  ))}</>;
}

function ExportSection({
  id,
  profile,
  width,
  height,
  resolveAsset,
  children
}: {
  id: UniversalTemplateBlockId;
  profile: TemplateProfile;
  width: number;
  height: number;
  resolveAsset: (src: `/${string}`) => string;
  children: ReactNode;
}) {
  const isBare = isUniversalBareSection(id);
  const underlay = isBare ? undefined : profile.assets.sections[id];
  const safeInsets = underlay ? getUnderlaySafeInsets(underlay) : null;
  const hasOverflowDecor = profile.assets.decor.some((layer) =>
    layer.anchor === id && exportVisible(layer) && normalizedRectOverflows(layer.rect)
  );
  const isMemories = id === "memories";
  const safePadding = safeInsets ? {
    top: Math.min(safeInsets.top * width, height * (isMemories ? .08 : .12)),
    right: safeInsets.right * width * (isMemories ? .45 : 1),
    bottom: Math.min(safeInsets.bottom * width, height * (isMemories ? .08 : .12)),
    left: safeInsets.left * width * (isMemories ? .45 : 1)
  } : null;
  return <div data-universal-export-block={id} data-section-presentation={isBare ? "bare" : "surface"} data-decor-overflow={hasOverflowDecor ? "visible" : undefined} style={{
    position: "relative",
    display: "flex",
    width: "100%",
    height,
    flexShrink: 0,
    overflow: isBare || hasOverflowDecor ? "visible" : "hidden",
    borderRadius: isBare ? 0 : 28,
    background: isBare ? "transparent" : profile.colors.surfaces[id] ?? profile.colors.surface,
    boxShadow: isBare ? "none" : "0 2px 5px rgba(0,0,0,.05), 0 16px 34px rgba(0,0,0,.08)"
  }}>
    {underlay ? <div data-export-underlay-clip style={{ position: "absolute", inset: 0, overflow: "hidden", borderRadius: 28 }}>
      {id === "closing"
        ? <HorizontalSliceAsset asset={underlay.asset} width={width} height={height} edgeRatio={.1} resolveAsset={resolveAsset} />
        : <SectionUnderlay underlay={underlay} resolveAsset={resolveAsset} className="universal-export-underlay" targetSize={{ width, height }} />}
    </div> : null}
    <Decor profile={profile} anchor={id} resolveAsset={resolveAsset} />
    <div style={{
      position: "relative",
      display: "flex",
      width: "100%",
      height: "100%",
      padding: safePadding ? `${safePadding.top}px ${safePadding.right}px ${safePadding.bottom}px ${safePadding.left}px` : 0,
      boxSizing: "border-box"
    }}>{children}</div>
  </div>;
}

function ExportPhoto({
  photo,
  frame,
  width,
  resolveAsset,
  resolvePhoto,
  fontSize,
  textColor,
  fontFamily,
  rotation = 0
}: {
  photo: UniversalTemplatePhoto;
  frame: UniversalPhotoFrame;
  width: number;
  resolveAsset: (src: `/${string}`) => string;
  resolvePhoto: (src: `/${string}`) => string;
  fontSize: number;
  textColor: string;
  fontFamily: string;
  rotation?: number;
}) {
  const framePreset = getUniversalPhotoFramePreset(frame.preset);
  const height = Math.round(width / framePreset.aspectRatio);
  const resolvedCaptionFontSize = fontSize * frame.caption.minScale;
  const alignItems = frame.caption.align === "left" ? "flex-start" : frame.caption.align === "right" ? "flex-end" : "center";
  const captionAreaStyle = width <= 360
    ? { ...rectStyle(framePreset.captionArea), top: "78%", height: "18%" }
    : rectStyle(framePreset.captionArea);
  return <div data-export-photo={photo.id} data-export-photo-rotation={rotation} style={{ position: "relative", display: "flex", width, height, flexShrink: 0, overflow: "hidden", transform: `rotate(${rotation}deg)`, boxShadow: "0 8px 18px rgba(0,0,0,.16)" }}>
    {frame.base ? <img src={resolveAsset(frame.base.src)} style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }} /> : null}
    <div style={{ position: "absolute", display: "flex", overflow: "hidden", ...rectStyle(framePreset.aperture) }}>
      <img data-export-photo-image src={resolvePhoto(photo.src)} style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: `${photo.crop.x * 100}% ${photo.crop.y * 100}%`, transform: `scale(${photo.crop.zoom})` }} />
    </div>
    {frame.overlay ? <img src={resolveAsset(frame.overlay.src)} style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }} /> : null}
    <div data-safe-text data-text-boundary data-text-preset="photo-caption" style={{ position: "absolute", display: "flex", flexDirection: "column", justifyContent: "center", alignItems, ...captionAreaStyle, overflow: "hidden", color: textColor, fontFamily, fontSize: resolvedCaptionFontSize, fontWeight: 600, lineHeight: width < 400 ? .88 : .96, textAlign: frame.caption.align }}>{photo.caption}</div>
  </div>;
}

function HorizontalSliceAsset({
  asset,
  width,
  height,
  edgeRatio,
  resolveAsset
}: {
  asset: TemplateAssetRef;
  width: number;
  height: number;
  edgeRatio: number;
  resolveAsset: (src: `/${string}`) => string;
}) {
  const sourceEdgeWidth = asset.width * edgeRatio;
  const targetEdgeWidth = Math.min(sourceEdgeWidth * (height / asset.height), width * .28);
  const sourceCenterWidth = asset.width - sourceEdgeWidth * 2;
  const targetCenterWidth = Math.max(0, width - targetEdgeWidth * 2);
  const src = resolveAsset(asset.src);
  const slices = [
    { x: 0, width: targetEdgeWidth, viewX: 0, viewWidth: sourceEdgeWidth },
    { x: targetEdgeWidth, width: targetCenterWidth, viewX: sourceEdgeWidth, viewWidth: sourceCenterWidth },
    { x: targetEdgeWidth + targetCenterWidth, width: targetEdgeWidth, viewX: sourceEdgeWidth + sourceCenterWidth, viewWidth: sourceEdgeWidth }
  ];

  return <svg data-export-asset-underlay="horizontal-slice" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}>
    {slices.map((slice, index) => <svg key={index} x={slice.x} y={0} width={slice.width} height={height} viewBox={`${slice.viewX} 0 ${slice.viewWidth} ${asset.height}`} preserveAspectRatio="none" overflow="hidden">
      <image href={src} x={0} y={0} width={asset.width} height={asset.height} preserveAspectRatio="none" />
    </svg>)}
  </svg>;
}

function NineSliceAsset({
  asset,
  width,
  height,
  edges,
  resolveAsset
}: {
  asset: TemplateAssetRef;
  width: number;
  height: number;
  edges: { top: number; right: number; bottom: number; left: number };
  resolveAsset: (src: `/${string}`) => string;
}) {
  const sourceXs = [0, edges.left, 1 - edges.right, 1];
  const sourceYs = [0, edges.top, 1 - edges.bottom, 1];
  const verticalEdgesHeight = (edges.top + edges.bottom) * asset.height;
  const scale = Math.min(width / asset.width, height / verticalEdgesHeight);
  const targetXs = [
    0,
    edges.left * asset.width * scale,
    width - edges.right * asset.width * scale,
    width
  ];
  const targetYs = [
    0,
    edges.top * asset.height * scale,
    height - edges.bottom * asset.height * scale,
    height
  ];
  const src = resolveAsset(asset.src);

  return <svg data-export-asset-underlay="nine-slice" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}>
    {[0, 1, 2].flatMap((row) => [0, 1, 2].map((column) => {
      const sourceX = sourceXs[column] * asset.width;
      const sourceY = sourceYs[row] * asset.height;
      const sourceWidth = (sourceXs[column + 1] - sourceXs[column]) * asset.width;
      const sourceHeight = (sourceYs[row + 1] - sourceYs[row]) * asset.height;
      return <svg key={`${row}-${column}`} x={targetXs[column]} y={targetYs[row]} width={Math.max(0, targetXs[column + 1] - targetXs[column])} height={Math.max(0, targetYs[row + 1] - targetYs[row])} viewBox={`${sourceX} ${sourceY} ${sourceWidth} ${sourceHeight}`} preserveAspectRatio="none" overflow="hidden">
        <image href={src} x={0} y={0} width={asset.width} height={asset.height} preserveAspectRatio="none" />
      </svg>;
    }))}
  </svg>;
}

function Moments({
  profile,
  photos,
  format,
  layout,
  resolveAsset,
  resolvePhoto
}: {
  profile: TemplateProfile;
  photos: readonly UniversalTemplatePhoto[];
  format: UniversalExportFormat;
  layout: FormatLayout;
  resolveAsset: (src: `/${string}`) => string;
  resolvePhoto: (src: `/${string}`) => string;
}) {
  if (photos.length < 2 || photos.length > 3) return null;
  const frame = profile.assets.photoFrames.memory;
  const captionFont = frame.caption.fontToken === "handwritten" ? profile.typography.handwritten.family : profile.typography.body.family;
  const sectionWidth = universalExportFormats[format].width - layouts[format].padding * 2;
  const underlay = profile.assets.sections.memories;
  const safeInsets = underlay ? getUnderlaySafeInsets(underlay) : { left: 0, right: 0 };
  const horizontalPadding = format === "post" ? 12 : 16;
  const contentWidth = sectionWidth * (1 - (safeInsets.left + safeInsets.right) * .45) - horizontalPadding;
  const primaryWidth = Math.round(Math.min(
    contentWidth * (format === "post" ? .58 : format === "story" ? .61 : .6),
    format === "post" ? 550 : format === "story" ? 565 : 610
  ));
  const sideWidth = Math.round(Math.min(
    contentWidth * (format === "post" ? .4 : .39),
    format === "post" ? 380 : format === "story" ? 360 : 375
  ));
  const captionSize = format === "post" ? 36 : 38;
  const columnGap = format === "post" ? 10 : 12;
  const sideGap = format === "story" ? 8 : 6;
  const sideCaptionSize = (caption: string) => caption.length > 42 ? 28 : 29;
  const heading = <div data-export-moments-heading style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: format === "post" ? 82 : 94, padding: "0 8px", boxSizing: "border-box", textAlign: "center" }}>
    <strong style={{ fontFamily: profile.typography.heading.family, fontSize: layout.heading, lineHeight: 1.04, textAlign: "center" }}>Моменты</strong>
    <span style={{ marginTop: 5, color: profile.colors.muted, fontFamily: profile.typography.handwritten.family, fontSize: format === "story" ? 28 : format === "a4" ? 26 : 22, fontWeight: profile.typography.handwritten.weight, lineHeight: 1.08, textAlign: "center" }}>Фото, которыми хочется поделиться</span>
  </div>;

  return <div data-export-memories-layout="feature-stack" style={{ display: "flex", width: "100%", height: "100%", padding: format === "post" ? "8px 6px" : "10px 8px", boxSizing: "border-box", alignItems: "center", justifyContent: "center" }}>
    <div data-export-photo-row style={{ display: "flex", width: "100%", alignItems: "flex-end", justifyContent: "center", gap: columnGap }}>
      <div data-export-primary-column style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-end", width: primaryWidth, flexShrink: 0 }}>
        {format === "post" ? null : heading}
        <ExportPhoto photo={photos[0]} frame={frame} width={primaryWidth} resolveAsset={resolveAsset} resolvePhoto={resolvePhoto} fontSize={captionSize} textColor={profile.colors.text} fontFamily={captionFont} rotation={-1.5} />
      </div>
      <div data-export-side-column style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-end", width: sideWidth, flexShrink: 0, gap: sideGap }}>
        {format === "post" ? heading : null}
        {photos.slice(1).map((photo, index) => <ExportPhoto key={photo.id} photo={photo} frame={frame} width={sideWidth} resolveAsset={resolveAsset} resolvePhoto={resolvePhoto} fontSize={sideCaptionSize(photo.caption)} textColor={profile.colors.text} fontFamily={captionFont} rotation={index === 0 ? 1.2 : -1.2} />)}
      </div>
    </div>
  </div>;
}

export function UniversalTemplateExportCard({
  profile,
  model,
  format,
  resolveAsset = (src) => src,
  resolvePhoto = (src) => src
}: UniversalExportCardProps) {
  const spec = universalExportFormats[format];
  const layout = layouts[format];
  const sectionWidth = spec.width - layout.padding * 2;
  const eventDate = formatUniversalEventDate(model.eventDate);
  const qualities = model.qualities.length === 5 ? model.qualities : [];
  const photos = model.memoryPhotos.length === 3 ? model.memoryPhotos.slice(0, spec.photoCount) : [];
  const quotes = model.publicQuotes.slice(0, spec.phraseCount);
  const shownPhotoCount = model.publicPhotoCount && model.publicPhotoCount > 0 ? model.publicPhotoCount : null;
  const sectionCount = 2 + Number(qualities.length > 0) + Number(photos.length > 0) + Number(quotes.length >= 2);
  const availableGap = sectionCount > 1 ? layout.gap : 0;
  const recipientNameTier = getUniversalRecipientNameTier(model.recipientName);
  const recipientNameScale = format === "post"
    ? { veryLong: .82, long: 1.05, default: 1.58 }
    : format === "a4"
      ? { veryLong: .9, long: 1.18, default: 1.7 }
      : { veryLong: .92, long: 1.22, default: 1.86 };
  const recipientNameFontSize = recipientNameTier === "very-long"
    ? layout.heading * recipientNameScale.veryLong
    : recipientNameTier === "long"
      ? layout.heading * recipientNameScale.long
      : layout.heading * recipientNameScale.default;
  const hasSchoolStats = profile.id === "school-scrapbook";

  return <div data-template-family="universal-v1" data-export-format={format} style={{
    position: "relative",
    display: "flex",
    width: "100%",
    height: "100%",
    overflow: "hidden",
    padding: `${layout.verticalPadding}px ${layout.padding}px`,
    boxSizing: "border-box",
    color: profile.colors.text,
    background: profile.colors.page,
    fontFamily: profile.typography.body.family,
    fontWeight: profile.typography.body.weight
  }}>
    {profile.assets.page ? <img src={resolveAsset(profile.assets.page.src)} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} /> : null}
    <Decor profile={profile} anchor="templateRoot" resolveAsset={resolveAsset} />
    <div style={{ position: "relative", display: "flex", flexDirection: "column", width: "100%", height: "100%", justifyContent: "space-between", gap: availableGap }}>
      <ExportSection id="hero" profile={profile} width={sectionWidth} height={layout.hero} resolveAsset={resolveAsset}>
        <div style={{ display: "flex", flexDirection: "column", width: "100%", height: "100%", alignItems: "center", justifyContent: "center", padding: format === "post" ? "8px 78px" : format === "a4" ? "14px 78px" : "20px 78px", boxSizing: "border-box", textAlign: "center" }}>
          {model.occasion ? <span style={{ color: profile.colors.accent, fontSize: format === "story" ? 18 : 14, fontWeight: 800, letterSpacing: ".08em", textTransform: "uppercase" }}>{model.occasion}</span> : null}
          {eventDate ? <span style={{ marginTop: 5, color: profile.colors.muted, fontSize: format === "story" ? 18 : 14 }}>{eventDate}</span> : null}
          <div data-safe-text data-text-boundary data-text-preset="recipient-name" style={{ display: "flex", width: "92%", height: format === "story" ? 150 : format === "post" ? 64 : 100, flexShrink: 0, marginTop: eventDate || model.occasion ? format === "post" ? 5 : 8 : 0, alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
            <strong style={{ maxWidth: "100%", maxHeight: "1.96em", overflow: "hidden", overflowWrap: "anywhere", fontFamily: profile.typography.heading.family, fontSize: recipientNameFontSize, fontWeight: profile.typography.heading.weight, lineHeight: .98, letterSpacing: "-.04em", textAlign: "center" }}>{model.recipientName}</strong>
          </div>
          <span style={{ maxWidth: 760, marginTop: 8, color: profile.colors.muted, fontSize: layout.body, lineHeight: 1.25, textAlign: "center" }}>{model.heroDescription}</span>
          <div data-export-hero-stats style={{ display: "flex", marginTop: 10, gap: 8 }}>
            {model.participantCount > 0 ? <span data-export-counter="congratulations" style={{ padding: "5px 10px", borderRadius: 999, color: hasSchoolStats ? "#1859bd" : undefined, background: hasSchoolStats ? "#fff0a8" : profile.colors.surface, boxShadow: hasSchoolStats ? "0 0 0 1px rgba(24, 89, 189, 0.12), 0 5px 12px rgba(24, 89, 189, 0.13)" : undefined, fontSize: layout.body - 3, fontVariantNumeric: "tabular-nums", fontWeight: hasSchoolStats ? 650 : undefined, transform: hasSchoolStats ? "rotate(-1.5deg)" : undefined }}><b>{model.participantCount}</b> поздравлений</span> : null}
            {shownPhotoCount ? <span data-export-counter="photos" style={{ padding: "5px 10px", borderRadius: 999, color: hasSchoolStats ? "#0b7278" : undefined, background: hasSchoolStats ? "#d9f3ef" : profile.colors.surface, boxShadow: hasSchoolStats ? "0 0 0 1px rgba(11, 114, 120, 0.12), 0 5px 12px rgba(11, 114, 120, 0.13)" : undefined, fontSize: layout.body - 3, fontVariantNumeric: "tabular-nums", fontWeight: hasSchoolStats ? 650 : undefined, transform: hasSchoolStats ? "rotate(1.5deg)" : undefined }}><b>{shownPhotoCount}</b> фото в открытке</span> : null}
          </div>
        </div>
      </ExportSection>

      {qualities.length > 0 ? <ExportSection id="qualities" profile={profile} width={sectionWidth} height={layout.qualities} resolveAsset={resolveAsset}>
        <div style={{ display: "flex", flexDirection: "column", width: "100%", height: "100%", alignItems: "center", justifyContent: "center", padding: "16px 28px", boxSizing: "border-box" }}>
          <strong style={{ fontFamily: profile.typography.heading.family, fontSize: layout.heading, textAlign: "center" }}>За что тебя ценят</strong>
          <div data-export-quality-grid="2-2-1" style={{ display: "flex", flexDirection: "column", width: "100%", marginTop: format === "story" ? 10 : 8, gap: format === "story" ? 7 : 6 }}>{[qualities.slice(0, 2), qualities.slice(2, 4), qualities.slice(4, 5)].map((row, rowIndex) => <div key={rowIndex} data-export-quality-row={rowIndex + 1} style={{ display: "flex", width: "100%", justifyContent: "center", gap: 9 }}>{row.map((quality, itemIndex) => {
            const index = rowIndex * 2 + itemIndex;
            const card = profile.assets.qualityCards[index % Math.max(profile.assets.qualityCards.length, 1)];
            const cardWidth = (sectionWidth - 56 - 9) / 2;
            const cardHeight = format === "story" ? 52 : format === "post" ? 42 : 46;
            return <div key={`${quality}-${index}`} data-export-quality-card style={{ position: "relative", display: "flex", width: cardWidth, minWidth: 0, height: cardHeight, flexShrink: 0, alignItems: "center", justifyContent: "center", overflow: "hidden", borderRadius: 14, background: profile.colors.surface }}>
              {card ? <NineSliceAsset asset={card.asset} width={cardWidth} height={cardHeight} edges={{ top: .19, right: .16, bottom: .23, left: .16 }} resolveAsset={resolveAsset} /> : null}
              <b data-safe-text data-text-boundary data-text-preset="quality-card" style={{ position: "absolute", display: "flex", alignItems: "center", justifyContent: "center", boxSizing: "border-box", overflow: "hidden", ...(card ? rectStyle(getUniversalTextCardPreset(card.preset).textArea) : { inset: 7 }), padding: 7, fontSize: format === "story" ? 27 : format === "post" ? 23 : 25, lineHeight: 1.04, textAlign: "center" }}>{quality}</b>
            </div>;
          })}</div>)}</div>
        </div>
      </ExportSection> : null}

      {photos.length >= 2 ? <ExportSection id="memories" profile={profile} width={sectionWidth} height={layout.moments} resolveAsset={resolveAsset}><Moments profile={profile} photos={photos} format={format} layout={layout} resolveAsset={resolveAsset} resolvePhoto={resolvePhoto} /></ExportSection> : null}

      {quotes.length >= 2 ? <ExportSection id="quotes" profile={profile} width={sectionWidth} height={layout.quotes} resolveAsset={resolveAsset}>
        <div style={{ display: "flex", flexDirection: "column", width: "100%", height: "100%", alignItems: "center", justifyContent: "center", padding: "0 28px", boxSizing: "border-box" }}>
          <strong style={{ fontFamily: profile.typography.heading.family, fontSize: layout.heading, lineHeight: 1.04, textAlign: "center" }}>Особенно тёплые слова</strong>
          <div style={{ display: "flex", width: "100%", marginTop: 10, gap: 10, flexShrink: 0 }}>{quotes.map((quote, index) => {
            const card = profile.assets.quoteCards[index % Math.max(profile.assets.quoteCards.length, 1)];
            const availableQuoteWidth = sectionWidth - 56;
            const cardWidth = format === "post"
              ? (availableQuoteWidth - 20) / 3
              : (availableQuoteWidth - 10 * (quotes.length - 1)) / quotes.length;
            const cardHeight = format === "story" ? 190 : format === "post" ? 125 : 160;
            const quoteFontSize = format === "story" ? 25 : format === "post" ? 20 : 22;
            const quoteTextAreaStyle = format === "post"
              ? { left: "5%", top: "10%", width: "90%", height: "80%" }
              : card ? rectStyle(getUniversalTextCardPreset(card.preset).textArea) : { inset: 12 };
            return <div key={`${quote}-${index}`} data-export-quote-card style={{ position: "relative", display: "flex", width: cardWidth, minWidth: 0, height: cardHeight, flexShrink: 0, alignItems: "center", justifyContent: "center", overflow: "hidden", borderRadius: 16, background: profile.colors.surface }}>
              {card ? format === "post"
                ? <NineSliceAsset asset={card.asset} width={cardWidth} height={cardHeight} edges={{ top: .18, right: .12, bottom: .18, left: .12 }} resolveAsset={resolveAsset} />
                : <img src={resolveAsset(card.asset.src)} style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }} />
                : null}
              <span aria-hidden="true" style={{ position: "absolute", left: 13, top: 5, color: profile.colors.accent, fontFamily: profile.typography.handwritten.family, fontSize: 38 }}>“</span>
              <span data-safe-text data-text-boundary data-text-preset="quote-card" style={{ position: "absolute", display: "flex", alignItems: "center", boxSizing: "border-box", overflow: "hidden", ...quoteTextAreaStyle, padding: "6px 10px", fontSize: quoteFontSize, lineHeight: format === "post" ? 1.02 : format === "a4" ? 1.08 : 1.1, textAlign: "center" }}>{quote}</span>
            </div>;
          })}</div>
        </div>
      </ExportSection> : null}

      <ExportSection id="closing" profile={profile} width={sectionWidth} height={layout.closing} resolveAsset={resolveAsset}>
        <div style={{ display: "flex", flexDirection: "column", width: "100%", height: "100%", alignItems: "center", justifyContent: "center", padding: "16px 72px", boxSizing: "border-box", textAlign: "center" }}>
          <strong style={{ fontFamily: profile.typography.heading.family, fontSize: layout.heading * .82, textAlign: "center" }}>В полной открытке — ещё больше тепла</strong>
          <span style={{ maxWidth: 830, marginTop: 7, color: profile.colors.muted, fontSize: layout.body, lineHeight: 1.2, textAlign: "center" }}>Здесь — лишь часть тёплых слов и моментов. Остальное бережно сохранено в полной открытке — только для получателя.</span>
          <img src={resolveAsset("/brand/email-logo.png")} style={{ width: format === "story" ? 160 : format === "a4" ? 150 : 130, height: format === "story" ? 37 : format === "a4" ? 35 : 30, objectFit: "contain", marginTop: 8 }} />
          <span style={{ marginTop: 3, color: profile.colors.muted, fontSize: layout.body - 4 }}>Место, где слова становятся подарком</span>
        </div>
      </ExportSection>
    </div>
  </div>;
}
