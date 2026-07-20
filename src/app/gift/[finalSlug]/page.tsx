import { notFound } from "next/navigation";
import { listCardDrafts, listCardMediaAssetsByCardId, listContributionsByCardId } from "@/lib/cards/repository";
import { cardTemplates } from "@/lib/cards/templates";
import { getGiftLifecycleByFinalSlug, markRecipientFirstOpened } from "@/lib/cards/lifecycle-repository";
import { FinalCard } from "@/components/final-card/final-card";
import { GiftIntro } from "@/components/gift-intro/gift-intro";
import { buildFinalCardViewModel } from "@/lib/final-card/view-model";
import { getAiCardInsight } from "@/lib/ai/repository";
import { BEST_QUOTE_COUNT, isValidBestQuoteText } from "@/lib/ai/card-insights";
import { JourneyEvent } from "@/components/telemetry/journey-event";

type Props = {
  params: Promise<{
    finalSlug: string;
  }>;
  searchParams: Promise<{
    debugAssets?: string;
    forceIntro?: string;
  }>;
};

export default async function GiftPage({ params, searchParams }: Props) {
  const [{ finalSlug }, { debugAssets, forceIntro }] = await Promise.all([params, searchParams]);
  const lifecycle = await getGiftLifecycleByFinalSlug(finalSlug);

  if (!lifecycle) {
    notFound();
  }

  const cards = await listCardDrafts();
  const card = cards.find((item) => item.id === lifecycle.id && !item.deletedAt);

  if (!card) {
    notFound();
  }

  const [contributions, mediaAssets, quotesInsight, qualitiesInsight] = await Promise.all([
    listContributionsByCardId(card.id),
    listCardMediaAssetsByCardId(card.id),
    getAiCardInsight(card.id, "quotes"),
    getAiCardInsight(card.id, "qualities")
  ]);
  const template = cardTemplates.find((item) => item.id === card.templateId);
  const model = buildFinalCardViewModel(card, contributions, mediaAssets, {
    quotes: quotesInsight?.items.length === BEST_QUOTE_COUNT && quotesInsight.items.every((item) => isValidBestQuoteText(item.text))
      ? quotesInsight.items.map((item) => item.text)
      : [],
    qualities: qualitiesInsight?.items.map((item) => item.text)
  });
  const isAssetDebugEnabled = process.env.NODE_ENV === "development" && debugAssets === "1";
  const isForceIntroEnabled = process.env.NODE_ENV === "development" && forceIntro === "1";
  await markRecipientFirstOpened(finalSlug);

  return (
    <><JourneyEvent event="gift_first_opened" cardId={card.id} route="gift" /><GiftIntro
      slug={finalSlug}
      recipientName={card.recipientName}
      fromLabel={card.fromLabel}
      templateId={card.templateId}
      accent={template?.accent}
      forceIntro={isForceIntroEnabled}
    >
      <FinalCard model={model} debugAssets={isAssetDebugEnabled} manageToken={card.manageToken} />
    </GiftIntro></>
  );
}
