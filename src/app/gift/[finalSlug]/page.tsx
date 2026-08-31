import { notFound } from "next/navigation";
import { listCardDrafts, listCardMediaAssetsByCardId, listContributionsByCardId } from "@/lib/cards/repository";
import { cardTemplates, isTemplateId } from "@/lib/cards/templates";
import { getGiftLifecycleByFinalSlug, markRecipientFirstOpened } from "@/lib/cards/lifecycle-repository";
import { TemplateCardRenderer } from "@/components/templates/template-card-renderer";
import { GiftIntro } from "@/components/gift-intro/gift-intro";
import { resolveFinalBestQuotes } from "@/lib/final-card/quote-selection";
import { getAiCardInsight, getAiCardQuoteSelection } from "@/lib/ai/repository";
import { JourneyEvent } from "@/components/telemetry/journey-event";
import { getPublicShareEditor } from "@/lib/public-shares/service";
import { buildPrivateCardPresentation } from "@/lib/templates/private-card-presentation";
import { defaultGiftAnimationId, isGiftAnimationId } from "@/lib/gift-animations";
import { selectGiftRevealMessages, toGiftRevealExcerpt } from "@/lib/gift-reveal-preview";

const toIntroFragment = (value: string, maxLength: number) => {
  const normalized = value.replace(/\s+/g, " ").trim();
  if (normalized.length <= maxLength) return normalized;

  const candidate = normalized.slice(0, maxLength + 1);
  const lastWordBoundary = candidate.lastIndexOf(" ");
  const end = lastWordBoundary > maxLength * 0.65 ? lastWordBoundary : maxLength;
  return `${candidate.slice(0, end).trimEnd()}…`;
};

type Props = {
  params: Promise<{
    finalSlug: string;
  }>;
  searchParams: Promise<{
    debugAssets?: string;
    intro?: string;
    motion?: string;
    reveal?: string;
    revealPhotos?: string;
  }>;
};

export default async function GiftPage({ params, searchParams }: Props) {
  const [{ finalSlug }, { debugAssets, intro, motion, reveal, revealPhotos }] = await Promise.all([params, searchParams]);
  const lifecycle = await getGiftLifecycleByFinalSlug(finalSlug);

  if (!lifecycle) {
    notFound();
  }

  const cards = await listCardDrafts();
  const card = cards.find((item) => item.id === lifecycle.id && !item.deletedAt);

  if (!card || !isTemplateId(card.templateId)) {
    notFound();
  }

  const [contributions, mediaAssets, quotesInsight, qualitiesInsight, savedQuoteSelection, publicShareEditor] = await Promise.all([
    listContributionsByCardId(card.id),
    listCardMediaAssetsByCardId(card.id),
    getAiCardInsight(card.id, "quotes"),
    getAiCardInsight(card.id, "qualities"),
    getAiCardQuoteSelection(card.id),
    getPublicShareEditor(finalSlug)
  ]);
  const template = cardTemplates.find((item) => item.id === card.templateId);
  const quoteSelection = resolveFinalBestQuotes(
    card,
    quotesInsight?.items.map((item) => item.text) ?? [],
    savedQuoteSelection && quotesInsight && savedQuoteSelection.sourceFingerprint === quotesInsight.sourceFingerprint
      ? savedQuoteSelection.items.map((item) => item.text)
      : []
  );
  const presentation = buildPrivateCardPresentation(card, contributions, mediaAssets, {
    quotes: quoteSelection.quotes,
    qualities: qualitiesInsight?.items.length === 5
      ? qualitiesInsight.items.map((item) => item.text)
      : []
  });
  if (!presentation) notFound();
  const isAssetDebugEnabled = process.env.NODE_ENV === "development" && debugAssets === "1";
  const hasPublicShareSettings = Boolean(publicShareEditor?.share || publicShareEditor?.wasRevoked);
  const publicShare = publicShareEditor ? {
    href: `/gift/${finalSlug}/share`,
    label: hasPublicShareSettings ? "Настроить публичную версию" as const : "Создать публичную версию" as const,
    active: publicShareEditor.share?.status === "ACTIVE"
  } : undefined;
  const introHeadline = toIntroFragment(
    presentation.kind === "universal-v1" ? presentation.model.mainGreeting : presentation.model.summaryText,
    180
  );
  const introPhraseSource = quoteSelection.quotes.length >= 2
    ? quoteSelection.quotes
    : contributions.map((contribution) => contribution.message);
  const introPhrases = introPhraseSource
    .map((phrase) => toGiftRevealExcerpt(phrase, 5))
    .filter((phrase, index, items) => phrase && phrase !== introHeadline && items.indexOf(phrase) === index)
    .slice(0, 3);
  const debugPhotoCount = process.env.NODE_ENV === "development" && /^[0-3]$/.test(revealPhotos ?? "")
    ? Number(revealPhotos)
    : 3;
  const introPhotos = mediaAssets
    .filter((asset) => asset.publicUrl)
    .slice(0, debugPhotoCount)
    .map((asset) => ({
      id: asset.id,
      src: asset.publicUrl,
      alt: asset.captionTitle || asset.captionSubtitle || `Фотография для открытки ${card.recipientName}`,
      objectPosition: `${asset.cropX ?? 50}% ${asset.cropY ?? 50}%`
    }));
  const persistedAnimationId = card.giftAnimationId ?? defaultGiftAnimationId;
  const animationId = process.env.NODE_ENV === "development" && reveal && isGiftAnimationId(reveal)
    ? reveal
    : persistedAnimationId;
  const introMessages = selectGiftRevealMessages(card, contributions);
  const introQualities = qualitiesInsight?.items.length === 5
    ? qualitiesInsight.items.map((item) => item.text)
    : [];
  await markRecipientFirstOpened(finalSlug);

  return (
    <><JourneyEvent event="gift_first_opened" cardId={card.id} route="gift" /><GiftIntro
      recipientName={card.recipientName}
      variant={intro === "legacy" ? "legacy" : "assembled"}
      forceFullMotion={motion === "full"}
      fromLabel={card.fromLabel}
      previewKicker={template?.introKicker}
      previewPreset={template?.introPreset}
      visualPreset={template?.introVisualPreset}
      previewDecor={template?.introDecor}
      templateId={card.templateId}
      animationId={animationId}
      accent={template?.accent}
      assemblyPreview={{
        headline: introHeadline,
        messages: introMessages,
        qualities: introQualities,
        phrases: introPhrases,
        photos: introPhotos
      }}
    >
      {presentation.kind === "universal-v1"
        ? <TemplateCardRenderer
            dispatch={presentation.dispatch}
            model={presentation.model}
            actionContext="private"
            publicVersionHref={publicShare?.href}
            debugSafeAreas={isAssetDebugEnabled}
          />
        : <TemplateCardRenderer
            dispatch={presentation.dispatch}
            model={presentation.model}
            debugAssets={isAssetDebugEnabled}
            publicShare={publicShare}
          />}
    </GiftIntro></>
  );
}
