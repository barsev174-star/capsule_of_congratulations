import { notFound } from "next/navigation";
import { PreviewBar } from "@/components/preview/preview-bar";
import { PreviewWatermark } from "@/components/preview/preview-watermark";
import { FinalCard } from "@/components/final-card/final-card";
import {
  getCardDraftByManageToken,
  listCardMediaAssetsByCardId,
  listContributionsByCardId
} from "@/lib/cards/repository";
import { isGiftPublished } from "@/lib/cards/status";
import { getAiCardInsight } from "@/lib/ai/repository";
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
  const card = await getCardDraftByManageToken(manageToken);

  if (!card) {
    notFound();
  }

  const [contributions, mediaAssets, quotesInsight, qualitiesInsight] = await Promise.all([
    listContributionsByCardId(card.id),
    listCardMediaAssetsByCardId(card.id),
    getAiCardInsight(card.id, "quotes"),
    getAiCardInsight(card.id, "qualities")
  ]);

  const model = buildFinalCardViewModel(card, contributions, mediaAssets, {
    quotes: quotesInsight?.items.map((item) => item.text),
    qualities: qualitiesInsight?.items.map((item) => item.text)
  });

  const published = isGiftPublished(card);

  return (
    <>
      <PreviewBar manageToken={manageToken} finalSlug={card.finalSlug} published={published} />
      <PreviewWatermark />
      <FinalCard model={model} mode="preview" manageToken={manageToken} />
    </>
  );
}
