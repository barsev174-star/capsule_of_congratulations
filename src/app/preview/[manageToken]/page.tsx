import { notFound } from "next/navigation";
import { PreviewBar } from "@/components/preview/preview-bar";
import { PreviewWatermark } from "@/components/preview/preview-watermark";
import { FinalCard } from "@/components/final-card/final-card";
import {
  getCardDraftByManageToken,
  listCardMediaAssetsByCardId,
  listContributionsByCardId
} from "@/lib/cards/repository";
import { getCardLifecycleByManageToken } from "@/lib/cards/lifecycle-repository";
import { isGiftAccessible } from "@/lib/cards/lifecycle";
import { getAiCardInsight } from "@/lib/ai/repository";
import { BEST_QUOTE_COUNT, isValidBestQuoteText } from "@/lib/ai/card-insights";
import { buildFinalCardViewModel } from "@/lib/final-card/view-model";

export const metadata = {
  robots: {
    index: false,
    follow: false
  }
};

type Props = {
  params: Promise<{
    manageToken: string;
  }>;
};

export default async function PreviewPage({ params }: Props) {
  const { manageToken } = await params;
  const [card, lifecycle] = await Promise.all([getCardDraftByManageToken(manageToken), getCardLifecycleByManageToken(manageToken)]);

  if (!card || !lifecycle || lifecycle.purgedAt !== null) {
    notFound();
  }

  const [contributions, mediaAssets, quotesInsight, qualitiesInsight] = await Promise.all([
    listContributionsByCardId(card.id),
    listCardMediaAssetsByCardId(card.id),
    getAiCardInsight(card.id, "quotes"),
    getAiCardInsight(card.id, "qualities")
  ]);

  const model = buildFinalCardViewModel(card, contributions, mediaAssets, {
    quotes: quotesInsight?.items.length === BEST_QUOTE_COUNT && quotesInsight.items.every((item) => isValidBestQuoteText(item.text))
      ? quotesInsight.items.map((item) => item.text)
      : [],
    qualities: qualitiesInsight?.items.map((item) => item.text)
  });

  const published = isGiftAccessible(lifecycle);

  return (
    <>
      <PreviewBar manageToken={manageToken} finalSlug={card.finalSlug} published={published} />
      <PreviewWatermark />
      <FinalCard model={model} mode="preview" manageToken={manageToken} />
    </>
  );
}
