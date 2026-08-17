import { notFound } from "next/navigation";
import { PreviewBar } from "@/components/preview/preview-bar";
import { PreviewWatermark } from "@/components/preview/preview-watermark";
import { TemplateCardRenderer } from "@/components/templates/template-card-renderer";
import {
  getCardDraftByManageToken,
  listCardMediaAssetsByCardId,
  listContributionsByCardId
} from "@/lib/cards/repository";
import { getCardLifecycleByManageToken } from "@/lib/cards/lifecycle-repository";
import { isGiftAccessible } from "@/lib/cards/lifecycle";
import { getAiCardInsight, getAiCardQuoteSelection } from "@/lib/ai/repository";
import {
  buildContributionFingerprint
} from "@/lib/ai/card-insights";
import { resolveFinalBestQuotes } from "@/lib/final-card/quote-selection";
import { finalCardLayouts } from "@/lib/final-card/layouts";
import { buildCardBlockReadiness } from "@/lib/manage/card-design-readiness";
import { getUniversalLayoutPreset } from "@/lib/templates/layout-presets";
import { buildPrivateCardPresentation } from "@/lib/templates/private-card-presentation";

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

  const [contributions, mediaAssets, quotesInsight, qualitiesInsight, savedQuoteSelection] = await Promise.all([
    listContributionsByCardId(card.id),
    listCardMediaAssetsByCardId(card.id),
    getAiCardInsight(card.id, "quotes"),
    getAiCardInsight(card.id, "qualities"),
    getAiCardQuoteSelection(card.id)
  ]);

  const fingerprint = buildContributionFingerprint(contributions);
  const quotesAreStale = Boolean(quotesInsight && quotesInsight.sourceFingerprint !== fingerprint);
  const qualitiesAreStale = Boolean(qualitiesInsight && qualitiesInsight.sourceFingerprint !== fingerprint);
  const quoteSelection = resolveFinalBestQuotes(
    card,
    quotesInsight?.items.map((item) => item.text) ?? [],
    savedQuoteSelection && quotesInsight && savedQuoteSelection.sourceFingerprint === quotesInsight.sourceFingerprint
      ? savedQuoteSelection.items.map((item) => item.text)
      : []
  );
  const quotes = quoteSelection.quotes;
  const effectiveQuotesAreStale = quotesAreStale && !quoteSelection.usesLegacyDefault;
  const qualities = qualitiesInsight?.items.length === 5
    ? qualitiesInsight.items.map((item) => item.text)
    : [];
  const presentation = buildPrivateCardPresentation(card, contributions, mediaAssets, {
    quotes,
    qualities
  }, { includeIncompleteBlocks: true });
  if (!presentation) notFound();
  const readinessLayout = presentation.kind === "legacy"
    ? finalCardLayouts[presentation.model.style]
    : finalCardLayouts[getUniversalLayoutPreset(presentation.dispatch.registration.profile.layoutPreset).referenceTemplateId];
  const blockReadiness = buildCardBlockReadiness({
    card,
    requiredBlockIds: readinessLayout.blocks
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
      {presentation.kind === "universal-v1"
        ? <TemplateCardRenderer
            dispatch={presentation.dispatch}
            model={presentation.model}
            actionContext="private"
            manageToken={manageToken}
            blockReadiness={blockReadiness}
          />
        : <TemplateCardRenderer
            dispatch={presentation.dispatch}
            model={presentation.model}
            mode="preview"
            manageToken={manageToken}
            blockReadiness={blockReadiness}
          />}
    </>
  );
}
