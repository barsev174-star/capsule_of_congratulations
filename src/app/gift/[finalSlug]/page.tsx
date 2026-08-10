import { notFound } from "next/navigation";
import { listCardDrafts, listCardMediaAssetsByCardId, listContributionsByCardId } from "@/lib/cards/repository";
import { cardTemplates, isTemplateId } from "@/lib/cards/templates";
import { getGiftLifecycleByFinalSlug, markRecipientFirstOpened } from "@/lib/cards/lifecycle-repository";
import { FinalCard } from "@/components/final-card/final-card";
import { GiftIntro } from "@/components/gift-intro/gift-intro";
import { buildFinalCardViewModel } from "@/lib/final-card/view-model";
import { resolveFinalBestQuotes } from "@/lib/final-card/quote-selection";
import { getAiCardInsight, getAiCardQuoteSelection } from "@/lib/ai/repository";
import { JourneyEvent } from "@/components/telemetry/journey-event";
import { getPublicShareEditor } from "@/lib/public-shares/service";

type Props = {
  params: Promise<{
    finalSlug: string;
  }>;
  searchParams: Promise<{
    debugAssets?: string;
  }>;
};

export default async function GiftPage({ params, searchParams }: Props) {
  const [{ finalSlug }, { debugAssets }] = await Promise.all([params, searchParams]);
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
  const model = buildFinalCardViewModel(card, contributions, mediaAssets, {
    quotes: quoteSelection.quotes,
    qualities: qualitiesInsight?.items.length === 5
      ? qualitiesInsight.items.map((item) => item.text)
      : []
  });
  const isAssetDebugEnabled = process.env.NODE_ENV === "development" && debugAssets === "1";
  const hasPublicShareSettings = Boolean(publicShareEditor?.share || publicShareEditor?.wasRevoked);
  const publicShare = publicShareEditor ? {
    href: `/gift/${finalSlug}/share`,
    label: hasPublicShareSettings ? "Настроить публичную версию" as const : "Создать публичную версию" as const,
    active: publicShareEditor.share?.status === "ACTIVE"
  } : undefined;
  await markRecipientFirstOpened(finalSlug);

  return (
    <><JourneyEvent event="gift_first_opened" cardId={card.id} route="gift" /><GiftIntro
      recipientName={card.recipientName}
      fromLabel={card.fromLabel}
      templateId={card.templateId}
      accent={template?.accent}
    >
      <FinalCard model={model} debugAssets={isAssetDebugEnabled} publicShare={publicShare} />
    </GiftIntro></>
  );
}
