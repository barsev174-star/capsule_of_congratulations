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
import {
  BEST_QUOTE_COUNT,
  buildContributionFingerprint,
  isValidBestQuoteText
} from "@/lib/ai/card-insights";
import { buildFinalCardViewModel } from "@/lib/final-card/view-model";
import { resolveFinalBestQuotes } from "@/lib/final-card/quote-selection";
import { finalCardLayouts } from "@/lib/final-card/layouts";
import { buildCardBlockReadiness } from "@/lib/manage/card-design-readiness";

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

  const fingerprint = buildContributionFingerprint(contributions);
  const quotesAreStale = Boolean(quotesInsight && quotesInsight.sourceFingerprint !== fingerprint);
  const qualitiesAreStale = Boolean(qualitiesInsight && qualitiesInsight.sourceFingerprint !== fingerprint);
  const quoteSelection = resolveFinalBestQuotes(
    card,
    quotesInsight?.items.map((item) => item.text) ?? [],
    quotesAreStale
  );
  const quotes = quoteSelection.quotes;
  const effectiveQuotesAreStale = quotesAreStale && !quoteSelection.usesLegacyDefault;
  const qualities = !qualitiesAreStale && qualitiesInsight?.items.length === 5
    ? qualitiesInsight.items.map((item) => item.text)
    : [];
  const model = buildFinalCardViewModel(card, contributions, mediaAssets, {
    quotes,
    qualities
  }, { includeIncompleteBlocks: true });
  const blockReadiness = buildCardBlockReadiness({
    card,
    requiredBlockIds: finalCardLayouts[model.style].blocks
      .filter((block) => block.required)
      .map((block) => block.id),
    visibleContributions: contributions,
    mediaAssets,
    qualities,
    qualitiesAreStale,
    bestQuotes: quotes,
    bestQuotesAreStale: effectiveQuotesAreStale
  });

  const published = isGiftAccessible(lifecycle);

  return (
    <>
      <PreviewBar manageToken={manageToken} finalSlug={card.finalSlug} published={published} />
      <PreviewWatermark />
      <FinalCard
        model={model}
        mode="preview"
        manageToken={manageToken}
        blockReadiness={blockReadiness}
      />
    </>
  );
}
