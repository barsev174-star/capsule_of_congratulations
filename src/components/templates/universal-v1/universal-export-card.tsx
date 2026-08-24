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
import {
  getUnderlaySafeInsets,
  getUniversalSectionUnderlayPreset,
  type TemplateSectionUnderlay
} from "@/lib/templates/section-underlays";
import { getUniversalPhotoFramePreset } from "@/lib/templates/photo-frame-presets";
import { getUniversalTextCardPreset } from "@/lib/templates/text-card-presets";
import {
  getUniversalPhotoCaptionScale,
  getUniversalRecipientNameLines,
  getUniversalRecipientNameTier
} from "@/lib/templates/text-capacity-presets";
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

const getArtworkQuoteFontSize = (format: UniversalExportFormat, quote: string) => {
  const baseFontSize = format === "story" ? 22 : format === "post" ? 16 : 20;
  const length = quote.trim().replace(/\s+/g, " ").length;

  if (format === "story" || length <= 80) return baseFontSize;
  if (length > 94) return format === "post" ? 12 : 15;
  return format === "post" ? 13 : 16;
};

const dedicatedQualityLayouts = {
  story: { sectionHeight: 295, cardHeight: 70, fontSize: 24 },
  post: { sectionHeight: 248, cardHeight: 60, fontSize: 20 },
  a4: { sectionHeight: 272, cardHeight: 65, fontSize: 22 }
} as const;

const rectStyle = (rect: NormalizedRect): CSSProperties => ({
  left: `${rect.x * 100}%`,
  top: `${rect.y * 100}%`,
  width: `${rect.width * 100}%`,
  height: `${rect.height * 100}%`
});

const exportVisible = (layer: TemplateDecorLayer) => !layer.visibleOn || layer.visibleOn.includes("export");
const exportDecorVariant = (layer: TemplateDecorLayer, format: UniversalExportFormat) =>
  layer.exportVariants?.[format] ?? layer;

const croppedAssetUrl = (
  resolvedSrc: string,
  source: { x: number; y: number; width: number; height: number },
  target: { width: number; height: number }
) => {
  const crop = [source.x, source.y, source.width, source.height].map((value) => Math.max(0, Math.round(value)));
  const separator = resolvedSrc.includes("?") ? "&" : "?";
  return `${resolvedSrc}${separator}crop=${crop.join(",")}&width=${Math.max(1, Math.round(target.width))}&height=${Math.max(1, Math.round(target.height))}`;
};

const slicedAssetUrl = (
  resolvedSrc: string,
  target: { width: number; height: number },
  slices: string
) => {
  const separator = resolvedSrc.includes("?") ? "&" : "?";
  return `${resolvedSrc}${separator}width=${Math.max(1, Math.round(target.width))}&height=${Math.max(1, Math.round(target.height))}&slices=${encodeURIComponent(slices)}`;
};

const coverCrop = (
  asset: TemplateAssetRef,
  target: { width: number; height: number },
  focalPoint = { x: .5, y: .5 }
) => {
  const sourceAspect = asset.width / asset.height;
  const targetAspect = target.width / target.height;
  if (sourceAspect > targetAspect) {
    const width = Math.max(1, Math.round(asset.height * targetAspect));
    return { x: Math.round((asset.width - width) * focalPoint.x), y: 0, width, height: asset.height };
  }
  const height = Math.max(1, Math.round(asset.width / targetAspect));
  return { x: 0, y: Math.round((asset.height - height) * focalPoint.y), width: asset.width, height };
};

function Decor({
  profile,
  anchor,
  format,
  width,
  height,
  resolveAsset
}: {
  profile: TemplateProfile;
  anchor: TemplateDecorLayer["anchor"];
  format: UniversalExportFormat;
  width: number;
  height: number;
  resolveAsset: (src: `/${string}`) => string;
}) {
  return <>{profile.assets.decor.filter((layer) => layer.anchor === anchor && exportVisible(layer) && layer.asset.src.startsWith("/")).map((layer) => {
    const variant = exportDecorVariant(layer, format);
    const box = {
      left: variant.rect.x * width,
      top: variant.rect.y * height,
      width: variant.rect.width * width,
      height: variant.rect.height * height
    };
    const assetAspect = layer.asset.width / layer.asset.height;
    const boxAspect = box.width / box.height;
    const renderedWidth = boxAspect > assetAspect ? box.height * assetAspect : box.width;
    const renderedHeight = boxAspect > assetAspect ? box.height : box.width / assetAspect;
    return <img
      key={layer.id}
      data-decor-layer={layer.id}
      data-decor-asset
      data-export-decor-format={format}
      src={resolveAsset(layer.asset.src)}
      width={Math.round(renderedWidth)}
      height={Math.round(renderedHeight)}
      style={{
        position: "absolute",
        left: box.left + (box.width - renderedWidth) / 2,
        top: box.top + (box.height - renderedHeight) / 2,
        width: renderedWidth,
        height: renderedHeight,
        opacity: variant.opacity ?? layer.opacity ?? 1,
        transform: `rotate(${variant.rotation ?? layer.rotation ?? 0}deg)`
      }}
    />;
  })}</>;
}

function ExportSection({
  id,
  profile,
  format,
  width,
  height,
  resolveAsset,
  children
}: {
  id: UniversalTemplateBlockId;
  profile: TemplateProfile;
  format: UniversalExportFormat;
  width: number;
  height: number;
  resolveAsset: (src: `/${string}`) => string;
  children: ReactNode;
}) {
  const isBare = isUniversalBareSection(id);
  const underlay = isBare ? undefined : profile.assets.sections[id];
  const safeInsets = underlay ? getUnderlaySafeInsets(underlay) : null;
  const hasOverflowDecor = profile.assets.decor.some((layer) =>
    layer.anchor === id && exportVisible(layer) && normalizedRectOverflows(exportDecorVariant(layer, format).rect)
  );
  const isMemories = id === "memories";
  const safePadding = safeInsets ? {
    top: Math.min(safeInsets.top * width, height * (isMemories ? .08 : .12)),
    right: safeInsets.right * width * (isMemories ? .45 : 1),
    bottom: Math.min(safeInsets.bottom * width, height * (isMemories ? .08 : .12)),
    left: safeInsets.left * width * (isMemories ? .45 : 1)
  } : null;
  return <div data-universal-export-block={id} data-section-presentation={isBare ? "bare" : "surface"} data-decor-overflow={hasOverflowDecor ? "visible" : undefined} style={{
    ...(id === "qualities" ? {} : { position: "relative" as const }),
    display: "flex",
    width: "100%",
    height,
    flexShrink: 0,
    overflow: isBare || hasOverflowDecor ? "visible" : "hidden",
    borderRadius: isBare ? 0 : 28,
    background: isBare ? "transparent" : profile.colors.surfaces[id] ?? profile.colors.surface,
    boxShadow: isBare ? "none" : "0 2px 5px rgba(0,0,0,.05), 0 16px 34px rgba(0,0,0,.08)"
  }}>
    {underlay ? <>
      {id === "closing" && underlay.exportRendering !== "cover"
        ? <HorizontalSliceAsset asset={underlay.asset} width={width} height={height} edgeRatio={underlay.exportHorizontalSliceEdgeRatio ?? .1} resolveAsset={resolveAsset} />
        : <ExportSectionUnderlay underlay={underlay} width={width} height={height} resolveAsset={resolveAsset} />}
    </> : null}
    {id === "closing" ? null : <Decor profile={profile} anchor={id} format={format} width={width} height={height} resolveAsset={resolveAsset} />}
    <div style={{
      position: underlay ? "absolute" : "relative",
      ...(underlay ? { left: 0, top: 0 } : {}),
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
  const resolvedCaptionFontSize = fontSize * getUniversalPhotoCaptionScale(
    photo.caption,
    frame.caption.minScale
  );
  const paperCaption = frame.caption.paper;
  const paperColor = paperCaption === "mint-coral" ? "#dceee2" : "#f6e4a5";
  const tapeColor = paperCaption === "mint-coral" ? "rgba(239,118,101,.72)" : "rgba(117,191,229,.8)";
  const alignItems = frame.caption.align === "left" ? "flex-start" : frame.caption.align === "right" ? "flex-end" : "center";
  const captionAreaStyle = paperCaption === "mint-coral"
    ? { ...rectStyle(framePreset.captionArea), top: "73.5%", height: "25%" }
    : frame.caption.layout === "expanded"
      ? { ...rectStyle(framePreset.captionArea), top: "76.5%", height: "22%" }
    : width <= 360
      ? { ...rectStyle(framePreset.captionArea), top: "78%", height: "18%" }
      : rectStyle(framePreset.captionArea);
  return <div data-export-photo={photo.id} data-export-photo-rotation={rotation} style={{ position: "relative", display: "flex", width, height, flexShrink: 0, overflow: "hidden", transform: `rotate(${rotation}deg)`, boxShadow: "0 8px 18px rgba(0,0,0,.16)" }}>
    {frame.base ? <img src={resolveAsset(frame.base.src)} style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }} /> : null}
    <div style={{ position: "absolute", display: "flex", overflow: "hidden", ...rectStyle(framePreset.aperture) }}>
      <img data-export-photo-image src={resolvePhoto(photo.src)} style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: `${photo.crop.x * 100}% ${photo.crop.y * 100}%`, transform: `scale(${photo.crop.zoom})` }} />
    </div>
    {frame.overlay ? <img src={resolveAsset(frame.overlay.src)} style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }} /> : null}
    <div data-safe-text data-text-boundary data-text-preset="photo-caption" data-caption-paper={paperCaption} style={{ position: "absolute", display: "flex", flexDirection: "column", justifyContent: "center", alignItems, ...captionAreaStyle, overflow: paperCaption ? "visible" : "hidden", color: textColor, fontFamily, fontSize: resolvedCaptionFontSize, fontWeight: 600, lineHeight: width < 400 ? .88 : .96, textAlign: frame.caption.align }}>
      {paperCaption ? <><span aria-hidden style={{ position: "absolute", zIndex: 0, inset: "5% 0 0", clipPath: "polygon(2% 10%,23% 2%,49% 8%,76% 0,98% 9%,96% 91%,72% 98%,45% 92%,20% 100%,3% 88%)", backgroundColor: paperColor, backgroundImage: "radial-gradient(circle at 7px 7px, rgba(63,127,149,.14) 1.3px, transparent 1.5px)", backgroundSize: "22px 22px", filter: "drop-shadow(0 5px 5px rgba(0,0,0,.14))" }} /><span aria-hidden style={{ position: "absolute", zIndex: 2, top: paperCaption === "mint-coral" ? "-4%" : 0, left: paperCaption === "mint-coral" ? "33%" : "35%", width: paperCaption === "mint-coral" ? "34%" : "30%", height: paperCaption === "mint-coral" ? "25%" : "19%", clipPath: "polygon(2% 13%,96% 0,100% 88%,4% 100%)", background: tapeColor, transform: `rotate(${paperCaption === "mint-coral" ? 1.5 : -2}deg)` }} /></> : null}
      <span style={{ position: "relative", zIndex: paperCaption ? 3 : 1 }}>{photo.caption}</span>
    </div>
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
  return <img data-export-asset-underlay="horizontal-slice" data-export-raster-slice src={slicedAssetUrl(resolveAsset(asset.src), { width, height }, `horizontal:${edgeRatio}`)} width={Math.round(width)} height={Math.round(height)} style={{ width: "100%", height: "100%", flexShrink: 0 }} />;
}

function NineSliceAsset({
  asset,
  width,
  height,
  edges,
  resolveAsset,
  inFlow = false,
  opacity = 1
}: {
  asset: TemplateAssetRef;
  width: number;
  height: number;
  edges: { top: number; right: number; bottom: number; left: number };
  resolveAsset: (src: `/${string}`) => string;
  inFlow?: boolean;
  opacity?: number;
}) {
  return <img
    data-export-asset-underlay="nine-slice"
    data-export-raster-slice
    src={slicedAssetUrl(resolveAsset(asset.src), { width, height }, `nine:${edges.top},${edges.right},${edges.bottom},${edges.left}`)}
    width={Math.round(width)}
    height={Math.round(height)}
    style={inFlow
      ? { width: "100%", height: "100%", flexShrink: 0, opacity }
      : { position: "absolute", left: 0, top: 0, width: "100%", height: "100%", opacity }}
  />;
}

function ExportSectionUnderlay({
  underlay,
  width,
  height,
  resolveAsset
}: {
  underlay: TemplateSectionUnderlay;
  width: number;
  height: number;
  resolveAsset: (src: `/${string}`) => string;
}) {
  const preset = getUniversalSectionUnderlayPreset(underlay.preset);
  if (preset.rendering === "nine-slice") {
    return <NineSliceAsset asset={underlay.asset} width={width} height={height} edges={preset.slices!} resolveAsset={resolveAsset} inFlow opacity={underlay.opacity ?? 1} />;
  }

  const focalPoint = underlay.focalPoint ?? { x: .5, y: .5 };
  const bottomEdgeHeight = preset.rendering === "bottom-edge"
    ? `${(preset.edgeSize ?? .12) * 100}%`
    : "100%";
  const targetHeight = preset.rendering === "bottom-edge" ? height * (preset.edgeSize ?? .12) : height;
  const src = croppedAssetUrl(
    resolveAsset(underlay.asset.src),
    coverCrop(underlay.asset, { width, height: targetHeight }, focalPoint),
    { width, height: targetHeight }
  );
  return <img data-underlay-preset={underlay.preset} src={src} width={Math.round(width)} height={Math.round(targetHeight)} style={{ width: "100%", height: bottomEdgeHeight, alignSelf: "flex-end", flexShrink: 0, opacity: underlay.opacity ?? 1 }} />;
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
  const qualityCards = profile.assets.exportQualityCards?.length === 5
    ? profile.assets.exportQualityCards
    : profile.assets.qualityCards;
  const hasDedicatedExportQualityCards = qualityCards === profile.assets.exportQualityCards;
  const useDedicatedQualityLayout = hasDedicatedExportQualityCards && qualities.length > 0;
  const dedicatedQualityLayout = dedicatedQualityLayouts[format];
  const qualitySectionHeight = useDedicatedQualityLayout ? dedicatedQualityLayout.sectionHeight : layout.qualities;
  const closingSectionHeight = useDedicatedQualityLayout
    ? layout.closing - (qualitySectionHeight - layout.qualities)
    : layout.closing;
  const qualityCardHeight = useDedicatedQualityLayout ? dedicatedQualityLayout.cardHeight : format === "story" ? 52 : format === "post" ? 42 : 46;
  const referenceQualityCard = qualityCards[0];
  const qualityCardWidth = referenceQualityCard
    ? qualityCardHeight * (referenceQualityCard.asset.width / referenceQualityCard.asset.height)
    : qualityCardHeight * (480 / 258);
  const qualityRows = [[0, 1], [2], [3, 4]] as const;
  const photos = model.memoryPhotos.length === 3 ? model.memoryPhotos.slice(0, spec.photoCount) : [];
  const quotes = model.publicQuotes.slice(0, spec.phraseCount);
  const shownPhotoCount = model.publicPhotoCount && model.publicPhotoCount > 0 ? model.publicPhotoCount : null;
  const sectionCount = 2 + Number(qualities.length > 0) + Number(photos.length > 0) + Number(quotes.length >= 2);
  const availableGap = sectionCount > 1 ? layout.gap : 0;
  const recipientNameTier = getUniversalRecipientNameTier(model.recipientName);
  const recipientNameLines = getUniversalRecipientNameLines(model.recipientName);
  const recipientNameScale = format === "post"
    ? { veryLong: .82, long: .82, default: 1.58 }
    : format === "a4"
      ? { veryLong: .9, long: 1.05, default: 1.7 }
      : { veryLong: .92, long: 1.22, default: 1.86 };
  const recipientNameFontSize = recipientNameTier === "very-long"
    ? layout.heading * recipientNameScale.veryLong
    : recipientNameTier === "long"
      ? layout.heading * recipientNameScale.long
      : layout.heading * recipientNameScale.default;
  const heroDescription = format === "story"
    ? model.heroDescription.replace("яркие моменты и пожелания", "яркие моменты\nи пожелания")
    : model.heroDescription;
  const heroDescriptionMaxWidth = profile.export.heroDescriptionMaxWidth?.[format] ?? 760;
  const congratulationsCounter = profile.export.counters?.congratulations ?? {
    text: profile.colors.accent,
    surface: profile.colors.surfaces.qualities ?? profile.colors.surface
  };
  const photosCounter = profile.export.counters?.photos ?? {
    text: profile.colors.text,
    surface: profile.colors.surfaces.memories ?? profile.colors.surface
  };
  const counterPreset = profile.export.counters?.preset ?? "soft-pill";
  const closingUsesHorizontalSlice = profile.assets.sections.closing?.exportRendering === "horizontal-slice";
  const closingLayout = profile.export.closingLayout?.[format];
  const counterStyle = (palette: { text: string; surface: string; outline?: string }, rotation: number): CSSProperties => {
    if (counterPreset === "classic-label") return {
        padding: "5px 11px",
        borderRadius: 7,
        color: palette.text,
        background: palette.surface,
        boxShadow: `0 0 0 1.5px ${palette.outline ?? palette.text}80, 0 4px 10px rgba(24,50,76,.12)`,
        fontSize: layout.body - 3,
        fontVariantNumeric: "tabular-nums",
        fontWeight: 700,
        transform: `rotate(${Number((rotation * .55).toFixed(3))}deg)`
      };
    return {
        padding: "5px 10px",
        borderRadius: 999,
        color: palette.text,
        background: palette.surface,
        boxShadow: `0 0 0 1px ${profile.colors.accent}1f, 0 5px 12px ${profile.colors.accent}21`,
        fontSize: layout.body - 3,
        fontVariantNumeric: "tabular-nums",
        fontWeight: 650,
      transform: `rotate(${rotation}deg)`
    };
  };
  const pageSrc = profile.assets.page
    ? croppedAssetUrl(
        resolveAsset(profile.assets.page.src),
        coverCrop(profile.assets.page, { width: spec.width, height: spec.height }),
        { width: spec.width, height: spec.height }
      )
    : null;

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
    {pageSrc ? <img data-export-page-underlay src={pageSrc} width={spec.width} height={spec.height} style={{ position: "absolute", left: 0, top: 0, width: "100%", height: "100%" }} /> : null}
    <Decor profile={profile} anchor="templateRoot" format={format} width={spec.width} height={spec.height} resolveAsset={resolveAsset} />
    <div style={{ position: "relative", display: "flex", flexDirection: "column", width: "100%", height: "100%", justifyContent: "space-between", gap: availableGap }}>
      <div data-universal-export-block="hero" data-section-presentation="bare" data-decor-overflow="visible" style={{ position: "relative", display: "flex", width: "100%", height: layout.hero, flexShrink: 0, overflow: "visible" }}>
        <Decor profile={profile} anchor="hero" format={format} width={sectionWidth} height={layout.hero} resolveAsset={resolveAsset} />
        <div style={{ position: "relative", display: "flex", flexDirection: "column", width: "100%", height: "100%", alignItems: "center", justifyContent: "center", padding: format === "post" ? "8px 78px" : format === "a4" ? "14px 78px" : "20px 78px", boxSizing: "border-box", textAlign: "center" }}>
          {model.occasion ? <span style={{ color: profile.colors.occasion ?? profile.colors.accent, fontSize: format === "story" ? 18 : 14, fontWeight: 800, letterSpacing: ".08em", textTransform: "uppercase" }}>{model.occasion}</span> : null}
          {eventDate ? <span style={{ marginTop: 5, color: profile.colors.muted, fontSize: format === "story" ? 18 : 14 }}>{eventDate}</span> : null}
          {model.recipientName ? <div data-safe-text data-text-boundary data-text-preset="recipient-name" style={{ display: "flex", width: "92%", height: format === "story" ? 150 : format === "post" ? 70 : 100, flexShrink: 0, marginTop: eventDate || model.occasion ? format === "post" ? 5 : 8 : 0, alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
            <span aria-label={model.recipientName} style={{ maxWidth: "100%", fontFamily: profile.typography.heading.family, fontSize: recipientNameFontSize, fontWeight: profile.typography.heading.weight, lineHeight: .98, letterSpacing: "-.04em", textAlign: "center", whiteSpace: "pre-line" }}>{recipientNameLines.join("\n")}</span>
          </div> : null}
          <span data-export-hero-description style={{ width: "100%", maxWidth: heroDescriptionMaxWidth, marginTop: 8, color: profile.colors.muted, fontSize: layout.body, lineHeight: 1.25, textAlign: "center", whiteSpace: "pre-line" }}>{heroDescription}</span>
          <div data-export-hero-stats style={{ display: "flex", marginTop: 10, gap: 8 }}>
            {model.participantCount > 0 ? <span data-export-counter="congratulations" data-export-counter-preset={counterPreset} style={counterStyle(congratulationsCounter, -1.5)}><b>{model.participantCount}</b> поздравлений</span> : null}
            {shownPhotoCount ? <span data-export-counter="photos" data-export-counter-preset={counterPreset} style={counterStyle(photosCounter, 1.5)}><b>{shownPhotoCount}</b> фото в открытке</span> : null}
          </div>
        </div>
      </div>

      {qualities.length > 0 ? <div data-universal-export-block="qualities" data-section-presentation="bare" style={{ display: "flex", width: "100%", height: qualitySectionHeight, flexShrink: 0 }}>
        <div style={{ display: "flex", flexDirection: "column", width: "100%", height: "100%", alignItems: "center", justifyContent: "center", padding: useDedicatedQualityLayout ? "6px 28px" : "16px 28px", boxSizing: "border-box" }}>
          <strong style={{ fontFamily: profile.typography.heading.family, fontSize: layout.heading, textAlign: "center" }}>{profile.copy?.qualitiesTitle ?? "За что тебя ценят"}</strong>
          <div data-export-quality-grid="2-1-2" style={{ display: "flex", flexDirection: "column", width: "100%", alignItems: "center", marginTop: useDedicatedQualityLayout ? 5 : format === "story" ? 10 : 8, gap: useDedicatedQualityLayout ? 4 : format === "story" ? 7 : 6 }}>{qualityRows.map((row, rowIndex) => <div key={rowIndex} data-export-quality-row={rowIndex + 1} style={{ display: "flex", width: row.length === 2 ? qualityCardWidth * 3 : qualityCardWidth, justifyContent: row.length === 2 ? "space-between" : "center" }}>{row.map((index) => {
            const quality = qualities[index];
            const card = qualityCards[index % Math.max(qualityCards.length, 1)];
            return <div key={`${quality}-${index}`} data-export-quality-card style={{ position: "relative", display: "flex", width: qualityCardWidth, minWidth: 0, height: qualityCardHeight, flexShrink: 0, alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
              {card ? <img data-export-quality-asset src={resolveAsset(card.asset.src)} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "contain" }} /> : null}
              <b data-safe-text data-text-boundary data-text-preset="quality-card" style={{ position: "absolute", display: "flex", alignItems: "center", justifyContent: "center", boxSizing: "border-box", overflow: "hidden", ...(card ? rectStyle(getUniversalTextCardPreset(card.preset).textArea) : { inset: 7 }), padding: 3, color: card?.textColor ?? profile.colors.text, fontSize: useDedicatedQualityLayout ? dedicatedQualityLayout.fontSize : format === "story" ? 15 : format === "post" ? 12 : 13, lineHeight: 1.04, textAlign: "center" }}>{quality}</b>
            </div>;
          })}</div>)}</div>
        </div>
      </div> : null}

      {photos.length >= 2 ? <ExportSection id="memories" profile={profile} format={format} width={sectionWidth} height={layout.moments} resolveAsset={resolveAsset}><Moments profile={profile} photos={photos} format={format} layout={layout} resolveAsset={resolveAsset} resolvePhoto={resolvePhoto} /></ExportSection> : null}

      {quotes.length >= 2 ? <div data-universal-export-block="quotes" data-section-presentation="bare" style={{ display: "flex", width: "100%", height: layout.quotes, flexShrink: 0 }}>
        <div style={{ display: "flex", flexDirection: "column", width: "100%", height: "100%", alignItems: "center", justifyContent: "center", padding: "0 28px", boxSizing: "border-box" }}>
          <strong style={{ fontFamily: profile.typography.heading.family, fontSize: layout.heading, lineHeight: 1.04, textAlign: "center" }}>{profile.copy?.quotesTitle ?? "Особенно тёплые слова"}</strong>
          <div style={{ display: "flex", width: "100%", marginTop: 10, gap: 10, flexShrink: 0 }}>{quotes.map((quote, index) => {
            const card = profile.assets.quoteCards[index % Math.max(profile.assets.quoteCards.length, 1)];
            const cardPreset = card ? getUniversalTextCardPreset(card.preset) : null;
            const availableQuoteWidth = sectionWidth - 56;
            const cardWidth = format === "post"
              ? (availableQuoteWidth - 20) / 3
              : (availableQuoteWidth - 10 * (quotes.length - 1)) / quotes.length;
            const cardHeight = format === "story" ? 190 : format === "post" ? 125 : 160;
            const artworkCard = cardPreset?.rendering === "artwork";
            const quoteFontSize = artworkCard
              ? getArtworkQuoteFontSize(format, quote)
              : format === "story" ? 25 : format === "post" ? 20 : 22;
            const quoteTextAreaStyle = cardPreset?.exportSlices
              ? rectStyle(cardPreset.textArea)
              : format === "post"
              ? { left: "5%", top: "10%", width: "90%", height: "80%" }
              : cardPreset ? rectStyle(cardPreset.textArea) : { inset: 12 };
            return <div key={`${quote}-${index}`} data-export-quote-card data-text-card-rendering={cardPreset?.rendering} style={{ position: "relative", display: "flex", width: cardWidth, minWidth: 0, height: cardHeight, flexShrink: 0, alignItems: "center", justifyContent: "center", overflow: "hidden", borderRadius: artworkCard ? 0 : 16, background: artworkCard ? "transparent" : profile.colors.surface }}>
              {card ? cardPreset?.exportSlices
                ? <NineSliceAsset asset={card.asset} width={cardWidth} height={cardHeight} edges={cardPreset.exportSlices} resolveAsset={resolveAsset} />
                : format === "post" && !artworkCard
                  ? <NineSliceAsset asset={card.asset} width={cardWidth} height={cardHeight} edges={{ top: .18, right: .12, bottom: .18, left: .12 }} resolveAsset={resolveAsset} />
                : <img src={resolveAsset(card.asset.src)} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "contain" }} />
                : null}
              {card && cardPreset?.exportDecorCrop && cardPreset.exportDecorArea ? <img
                data-export-quote-decor
                src={croppedAssetUrl(resolveAsset(card.asset.src), {
                  x: cardPreset.exportDecorCrop.x * card.asset.width,
                  y: cardPreset.exportDecorCrop.y * card.asset.height,
                  width: cardPreset.exportDecorCrop.width * card.asset.width,
                  height: cardPreset.exportDecorCrop.height * card.asset.height
                }, {
                  width: cardPreset.exportDecorArea.width * cardWidth,
                  height: cardPreset.exportDecorArea.height * cardHeight
                })}
                style={{ position: "absolute", ...rectStyle(cardPreset.exportDecorArea), objectFit: "contain" }}
              /> : null}
              {cardPreset?.renderLeadingQuote !== false ? <span aria-hidden="true" style={{ position: "absolute", left: 13, top: 5, color: profile.colors.accent, fontFamily: profile.typography.handwritten.family, fontSize: 38 }}>“</span> : null}
              <span data-safe-text data-text-boundary data-text-preset="quote-card" style={{ position: "absolute", display: "flex", alignItems: "center", boxSizing: "border-box", overflow: "hidden", ...quoteTextAreaStyle, padding: "6px 10px", fontFamily: profile.typography.body.family, fontWeight: profile.typography.body.weight, fontSize: quoteFontSize, lineHeight: 1.18, textAlign: "center" }}>{quote}</span>
            </div>;
          })}</div>
        </div>
      </div> : null}

      <ExportSection id="closing" profile={profile} format={format} width={sectionWidth} height={closingSectionHeight} resolveAsset={resolveAsset}>
        <div data-export-closing-content style={{ display: "flex", flexDirection: "column", width: closingLayout ? `${closingLayout.contentWidthPercent}%` : closingUsesHorizontalSlice ? format === "story" ? "58%" : "70%" : "100%", height: "100%", margin: "0 auto", alignItems: "center", justifyContent: "center", padding: closingUsesHorizontalSlice ? "12px 0" : "16px 72px", boxSizing: "border-box", color: profile.colors.text, textAlign: "center" }}>
          <strong data-export-closing-heading style={{ fontFamily: profile.typography.heading.family, fontSize: closingLayout?.headingFontSize ?? layout.heading * .82, lineHeight: 1.05, whiteSpace: closingLayout ? "nowrap" : format === "story" ? "normal" : "nowrap", textAlign: "center" }}>В полной открытке — ещё больше тепла</strong>
          <span data-export-closing-body style={{ maxWidth: 830, marginTop: 7, color: profile.colors.muted, fontSize: closingLayout?.bodyFontSize ?? layout.body, lineHeight: 1.2, textAlign: "center" }}>Здесь — лишь часть тёплых слов и моментов. Остальное бережно сохранено в полной открытке — только для получателя.</span>
          <div data-export-closing-brand style={{ display: "flex", flexDirection: "column", alignItems: "center", marginTop: closingLayout?.brandMarginTop ?? (format === "story" ? 8 : 5), ...(closingLayout ? {} : { transform: `translateY(${format === "story" ? -4 : -10}px)` }) }}>
            <img data-export-closing-logo src={resolveAsset("/brand/email-logo.png")} style={{ width: closingLayout?.logoWidth ?? (format === "story" ? 160 : format === "a4" ? 150 : 130), height: closingLayout?.logoHeight ?? (format === "story" ? 37 : format === "a4" ? 35 : 30), objectFit: "contain" }} />
            <span data-export-closing-tagline style={{ marginTop: 1, color: profile.colors.muted, fontSize: closingLayout?.taglineFontSize ?? layout.body - 4 }}>Место, где слова становятся подарком</span>
          </div>
        </div>
      </ExportSection>
    </div>
    <div data-export-closing-decor style={{ position: "absolute", display: "flex", left: layout.padding, top: spec.height - layout.verticalPadding - closingSectionHeight, width: sectionWidth, height: closingSectionHeight }}>
      <Decor profile={profile} anchor="closing" format={format} width={sectionWidth} height={closingSectionHeight} resolveAsset={resolveAsset} />
    </div>
  </div>;
}
