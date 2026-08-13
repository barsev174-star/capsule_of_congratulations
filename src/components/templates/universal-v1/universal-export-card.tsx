/* eslint-disable @next/next/no-img-element, jsx-a11y/alt-text -- The component is rasterized by ImageResponse. */
import type { CSSProperties, ReactNode } from "react";
import type {
  NormalizedRect,
  TemplateDecorLayer,
  TemplateProfile,
  UniversalPhotoFrame,
  UniversalTemplateBlockId
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
  getUniversalPhotoCaptionLengthScale,
  getUniversalRecipientNameTier
} from "@/lib/templates/text-capacity-presets";
import { SectionUnderlay } from "./section-underlay";

export const universalExportFormats = {
  story: { width: 1080, height: 1920, phraseCount: 2 },
  post: { width: 1080, height: 1350, phraseCount: 2 },
  a4: { width: 1240, height: 1754, phraseCount: 3 }
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
  story: { padding: 58, gap: 20, hero: 300, qualities: 220, moments: 720, quotes: 270, closing: 190, heading: 44, body: 25 },
  post: { padding: 42, gap: 10, hero: 220, qualities: 180, moments: 470, quotes: 205, closing: 145, heading: 34, body: 20 },
  a4: { padding: 56, gap: 18, hero: 260, qualities: 190, moments: 650, quotes: 245, closing: 175, heading: 38, body: 22 }
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
  return <>{profile.assets.decor.filter((layer) => layer.anchor === anchor && exportVisible(layer)).map((layer) => (
    <div key={layer.id} style={{ position: "absolute", display: "flex", ...rectStyle(layer.rect), opacity: layer.opacity ?? 1, transform: `rotate(${layer.rotation ?? 0}deg)` }}>
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
  const underlay = profile.assets.sections[id];
  const safeInsets = underlay ? getUnderlaySafeInsets(underlay) : null;
  return <div data-universal-export-block={id} style={{
    position: "relative",
    display: "flex",
    width: "100%",
    height,
    flexShrink: 0,
    overflow: "hidden",
    borderRadius: 28,
    background: profile.colors.surfaces[id] ?? profile.colors.surface,
    boxShadow: "0 2px 5px rgba(0,0,0,.05), 0 16px 34px rgba(0,0,0,.08)"
  }}>
    {underlay ? <SectionUnderlay underlay={underlay} resolveAsset={resolveAsset} className="universal-export-underlay" targetSize={{ width, height }} /> : null}
    <Decor profile={profile} anchor={id} resolveAsset={resolveAsset} />
    <div style={{
      position: "relative",
      display: "flex",
      width: "100%",
      height: "100%",
      padding: safeInsets ? `${safeInsets.top * 100}% ${safeInsets.right * 100}% ${safeInsets.bottom * 100}% ${safeInsets.left * 100}%` : 0,
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
  fontFamily
}: {
  photo: UniversalTemplatePhoto;
  frame: UniversalPhotoFrame;
  width: number;
  resolveAsset: (src: `/${string}`) => string;
  resolvePhoto: (src: `/${string}`) => string;
  fontSize: number;
  textColor: string;
  fontFamily: string;
}) {
  const framePreset = getUniversalPhotoFramePreset(frame.preset);
  const height = Math.round(width / framePreset.aspectRatio);
  const resolvedCaptionFontSize = fontSize * frame.caption.minScale * getUniversalPhotoCaptionLengthScale(photo.caption);
  const alignItems = frame.caption.align === "left" ? "flex-start" : frame.caption.align === "right" ? "flex-end" : "center";
  return <div data-export-photo={photo.id} style={{ position: "relative", display: "flex", width, height, flexShrink: 0, overflow: "hidden" }}>
    {frame.base ? <img src={resolveAsset(frame.base.src)} style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }} /> : null}
    <div style={{ position: "absolute", display: "flex", overflow: "hidden", ...rectStyle(framePreset.aperture) }}>
      <img data-export-photo-image src={resolvePhoto(photo.src)} style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: `${photo.crop.x * 100}% ${photo.crop.y * 100}%`, transform: `scale(${photo.crop.zoom})` }} />
    </div>
    {frame.overlay ? <img src={resolveAsset(frame.overlay.src)} style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }} /> : null}
    <div data-safe-text data-text-boundary data-text-preset="photo-caption" style={{ position: "absolute", display: "flex", flexDirection: "column", justifyContent: "center", alignItems, ...rectStyle(framePreset.captionArea), overflow: "hidden", color: textColor, fontFamily, fontSize: resolvedCaptionFontSize, fontWeight: 600, lineHeight: 1.02, textAlign: frame.caption.align }}>{photo.caption}</div>
  </div>;
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
  if (photos.length !== 3) return null;
  const frame = profile.assets.photoFrames.memory;
  const captionFont = frame.caption.fontToken === "handwritten" ? profile.typography.handwritten.family : profile.typography.body.family;
  const innerWidth = universalExportFormats[format].width - layouts[format].padding * 2 - 64;
  const captionSize = format === "post" ? 22 : 27;
  const gap = format === "story" ? 14 : 12;
  const widthUnit = (innerWidth - gap * 2) / 3.18;
  const primaryWidth = Math.round(widthUnit * 1.18);
  const sideWidth = Math.round(widthUnit);

  return <div data-export-memories-layout="route-strip" style={{ display: "flex", flexDirection: "column", width: "100%", height: "100%", padding: format === "story" ? "25px 32px" : format === "a4" ? "28px 32px" : "18px 30px", boxSizing: "border-box", alignItems: "center", justifyContent: "center" }}>
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: format === "story" ? 12 : 5 }}><span style={{ color: profile.colors.accent, fontSize: format === "story" ? 15 : 12, fontWeight: 800, letterSpacing: ".08em", textTransform: "uppercase" }}>Фотоистория</span><strong style={{ marginTop: 2, fontFamily: profile.typography.heading.family, fontSize: layout.heading, textAlign: "center" }}>Моменты, которые хочется сохранить</strong></div>
    <div data-export-photo-row style={{ display: "flex", width: "100%", alignItems: "flex-start", justifyContent: "center", gap }}>
      <ExportPhoto photo={photos[0]} frame={frame} width={primaryWidth} resolveAsset={resolveAsset} resolvePhoto={resolvePhoto} fontSize={captionSize} textColor={profile.colors.text} fontFamily={captionFont} />
      <ExportPhoto photo={photos[1]} frame={frame} width={sideWidth} resolveAsset={resolveAsset} resolvePhoto={resolvePhoto} fontSize={captionSize - 2} textColor={profile.colors.text} fontFamily={captionFont} />
      <ExportPhoto photo={photos[2]} frame={frame} width={sideWidth} resolveAsset={resolveAsset} resolvePhoto={resolvePhoto} fontSize={captionSize - 2} textColor={profile.colors.text} fontFamily={captionFont} />
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
  const photos = model.memoryPhotos.length === 3 ? model.memoryPhotos : [];
  const quotes = model.publicQuotes.slice(0, spec.phraseCount);
  const shownPhotoCount = model.publicPhotoCount && model.publicPhotoCount > 0 ? model.publicPhotoCount : null;
  const sectionCount = 2 + Number(qualities.length > 0) + Number(photos.length > 0) + Number(quotes.length >= 2);
  const availableGap = sectionCount > 1 ? layout.gap : 0;
  const recipientNameTier = getUniversalRecipientNameTier(model.recipientName);
  const recipientNameFontSize = recipientNameTier === "very-long"
    ? layout.heading * .92
    : recipientNameTier === "long"
      ? layout.heading * 1.22
      : layout.heading * 1.62;

  return <div data-template-family="universal-v1" data-export-format={format} style={{
    position: "relative",
    display: "flex",
    width: "100%",
    height: "100%",
    overflow: "hidden",
    padding: layout.padding,
    boxSizing: "border-box",
    color: profile.colors.text,
    background: profile.colors.page,
    fontFamily: profile.typography.body.family,
    fontWeight: profile.typography.body.weight
  }}>
    {profile.assets.page ? <img src={resolveAsset(profile.assets.page.src)} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", opacity: .24 }} /> : null}
    <Decor profile={profile} anchor="templateRoot" resolveAsset={resolveAsset} />
    <div style={{ position: "relative", display: "flex", flexDirection: "column", width: "100%", height: "100%", justifyContent: "space-between", gap: availableGap }}>
      <ExportSection id="hero" profile={profile} width={sectionWidth} height={layout.hero} resolveAsset={resolveAsset}>
        <div style={{ display: "flex", flexDirection: "column", width: "100%", height: "100%", alignItems: "center", justifyContent: "center", padding: "20px 78px", boxSizing: "border-box", textAlign: "center" }}>
          {model.occasion ? <span style={{ color: profile.colors.accent, fontSize: format === "story" ? 18 : 14, fontWeight: 800, letterSpacing: ".08em", textTransform: "uppercase" }}>{model.occasion}</span> : null}
          {eventDate ? <span style={{ marginTop: 5, color: profile.colors.muted, fontSize: format === "story" ? 18 : 14 }}>{eventDate}</span> : null}
          <div data-safe-text data-text-boundary data-text-preset="recipient-name" style={{ display: "flex", width: "92%", height: format === "story" ? 150 : 108, marginTop: eventDate || model.occasion ? 8 : 0, alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
            <strong style={{ maxWidth: "100%", maxHeight: "1.96em", overflow: "hidden", overflowWrap: "anywhere", fontFamily: profile.typography.heading.family, fontSize: recipientNameFontSize, fontWeight: profile.typography.heading.weight, lineHeight: .98, letterSpacing: "-.04em", textAlign: "center" }}>{model.recipientName}</strong>
          </div>
          <span style={{ maxWidth: 760, marginTop: 8, color: profile.colors.muted, fontSize: layout.body, lineHeight: 1.25, textAlign: "center" }}>{model.heroDescription}</span>
          <div style={{ display: "flex", marginTop: 10, gap: 8 }}>{model.participantCount > 0 ? <span style={{ padding: "5px 10px", borderRadius: 999, background: profile.colors.surface, fontSize: layout.body - 3 }}><b>{model.participantCount}</b> поздравлений</span> : null}{shownPhotoCount ? <span style={{ padding: "5px 10px", borderRadius: 999, background: profile.colors.surface, fontSize: layout.body - 3 }}><b>{shownPhotoCount}</b> фото</span> : null}</div>
        </div>
      </ExportSection>

      {qualities.length > 0 ? <ExportSection id="qualities" profile={profile} width={sectionWidth} height={layout.qualities} resolveAsset={resolveAsset}>
        <div style={{ display: "flex", flexDirection: "column", width: "100%", height: "100%", alignItems: "center", justifyContent: "center", padding: "16px 28px", boxSizing: "border-box" }}>
          <span style={{ color: profile.colors.accent, fontSize: format === "story" ? 15 : 12, fontWeight: 800, letterSpacing: ".08em", textTransform: "uppercase" }}>За что тебя ценят</span>
          <strong style={{ marginTop: 3, fontFamily: profile.typography.heading.family, fontSize: layout.heading, textAlign: "center" }}>Пять особенных качеств</strong>
          <div style={{ display: "flex", width: "100%", marginTop: 12, gap: 8 }}>{qualities.map((quality, index) => {
            const card = profile.assets.qualityCards[index % Math.max(profile.assets.qualityCards.length, 1)];
            return <div key={`${quality}-${index}`} style={{ position: "relative", display: "flex", minWidth: 0, flex: 1, minHeight: format === "story" ? 86 : 62, alignItems: "center", justifyContent: "center", overflow: "hidden", borderRadius: 16, background: profile.colors.surface }}>
              {card ? <img src={resolveAsset(card.asset.src)} style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }} /> : null}
              <b data-safe-text data-text-boundary data-text-preset="quality-card" style={{ position: "absolute", display: "flex", alignItems: "center", justifyContent: "center", boxSizing: "border-box", overflow: "hidden", ...(card ? rectStyle(getUniversalTextCardPreset(card.preset).textArea) : { inset: 7 }), padding: 7, fontSize: format === "story" ? 18 : 15, lineHeight: 1.12, textAlign: "center" }}>{quality}</b>
            </div>;
          })}</div>
        </div>
      </ExportSection> : null}

      {photos.length === 3 ? <ExportSection id="memories" profile={profile} width={sectionWidth} height={layout.moments} resolveAsset={resolveAsset}><Moments profile={profile} photos={photos} format={format} layout={layout} resolveAsset={resolveAsset} resolvePhoto={resolvePhoto} /></ExportSection> : null}

      {quotes.length >= 2 ? <ExportSection id="quotes" profile={profile} width={sectionWidth} height={layout.quotes} resolveAsset={resolveAsset}>
        <div style={{ display: "flex", flexDirection: "column", width: "100%", height: "100%", alignItems: "center", justifyContent: "center", padding: "16px 28px", boxSizing: "border-box" }}>
          <span style={{ color: profile.colors.accent, fontSize: format === "story" ? 15 : 12, fontWeight: 800, letterSpacing: ".08em", textTransform: "uppercase" }}>Выбор получателя</span>
          <strong style={{ marginTop: 2, fontFamily: profile.typography.heading.family, fontSize: layout.heading, textAlign: "center" }}>Лучшие фразы</strong>
          <div style={{ display: "flex", width: "100%", marginTop: 10, gap: 10 }}>{quotes.map((quote, index) => {
            const card = profile.assets.quoteCards[index % Math.max(profile.assets.quoteCards.length, 1)];
            return <div key={`${quote}-${index}`} style={{ position: "relative", display: "flex", flex: 1, minWidth: 0, minHeight: format === "story" ? 116 : 90, alignItems: "center", justifyContent: "center", overflow: "hidden", borderRadius: 16, background: profile.colors.surface }}>
              {card ? <img src={resolveAsset(card.asset.src)} style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }} /> : null}
              <span aria-hidden="true" style={{ position: "absolute", left: 13, top: 5, color: profile.colors.accent, fontFamily: profile.typography.handwritten.family, fontSize: 38 }}>“</span>
              <span data-safe-text data-text-boundary data-text-preset="quote-card" style={{ position: "absolute", display: "flex", alignItems: "center", boxSizing: "border-box", overflow: "hidden", ...(card ? rectStyle(getUniversalTextCardPreset(card.preset).textArea) : { inset: 12 }), padding: "6px 10px", fontSize: format === "story" ? 20 : 16, lineHeight: 1.18, textAlign: "center" }}>{quote}</span>
            </div>;
          })}</div>
        </div>
      </ExportSection> : null}

      <ExportSection id="closing" profile={profile} width={sectionWidth} height={layout.closing} resolveAsset={resolveAsset}>
        <div style={{ display: "flex", flexDirection: "column", width: "100%", height: "100%", alignItems: "center", justifyContent: "center", padding: "16px 72px", boxSizing: "border-box", textAlign: "center" }}>
          <strong style={{ fontFamily: profile.typography.heading.family, fontSize: layout.heading * .82, textAlign: "center" }}>В полной открытке — ещё больше тепла</strong>
          <span style={{ maxWidth: 830, marginTop: 7, color: profile.colors.muted, fontSize: layout.body, lineHeight: 1.25, textAlign: "center" }}>Личные поздравления и важные воспоминания бережно сохранены только для получателя.</span>
          <span style={{ marginTop: 8, color: profile.colors.accent, fontSize: layout.body - 2, fontWeight: 800 }}>Slovesto</span>
        </div>
      </ExportSection>
    </div>
  </div>;
}
