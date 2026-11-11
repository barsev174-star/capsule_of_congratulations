import { notFound, redirect } from "next/navigation";
import { GiftIntro } from "@/components/gift-intro/gift-intro";
import { PreviewBar } from "@/components/preview/preview-bar";
import { PreviewWatermark } from "@/components/preview/preview-watermark";
import { TemplateCardRenderer } from "@/components/templates/template-card-renderer";
import {
  getCardDraftByLegacyManageToken,
  getCardDraftByManagementId,
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
import { getCardManagementAccess } from "@/lib/manage/access";
import { resolveCardRecoveryToken } from "@/lib/manage/recovery-tokens";
import { getGiftIntroScene } from "@/lib/templates/gift-intro-scene";

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
  searchParams?: Promise<{ opening?: string }>;
};

export default async function PreviewPage({ params, searchParams }: Props) {
  const { manageToken: identifier } = await params;
  const openingRequested = (await searchParams)?.opening === "1";
  const permanentCard = await getCardDraftByManagementId(identifier);
  const recoveryCardId = permanentCard ? null : await resolveCardRecoveryToken(identifier);
  const recoveryCard = permanentCard
    ? null
    : recoveryCardId
      ? await getCardDraftByManagementId(recoveryCardId)
      : await getCardDraftByLegacyManageToken(identifier);
  const card = permanentCard ?? recoveryCard;
  if (!card) notFound();
  const access = await getCardManagementAccess(card, { allowGuestDraft: true });
  if (!access.allowed) redirect(`/manage/${recoveryCard ? identifier : card.id}`);
  if (identifier !== card.id) redirect(`/preview/${card.id}${openingRequested ? "?opening=1" : ""}`);
  const lifecycle = await getCardLifecycleByManageToken(card.id);

  if (!lifecycle || lifecycle.purgedAt !== null) {
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

  const canPreviewOpening = card.giftAnimationId === "winter-wonder";
  const showOpening = canPreviewOpening && openingRequested;
  const preview = (
    <>
      <PreviewBar
        manageToken={card.id}
        finalSlug={card.finalSlug}
        published={published}
        openingPreviewHref={canPreviewOpening && !showOpening ? `/preview/${card.id}?opening=1` : undefined}
      />
      <PreviewWatermark />
      {presentation.kind === "universal-v1"
        ? <TemplateCardRenderer
            dispatch={presentation.dispatch}
            model={presentation.model}
            actionContext="private"
            manageToken={card.id}
            blockReadiness={blockReadiness}
          />
        : <TemplateCardRenderer
            dispatch={presentation.dispatch}
            model={presentation.model}
            mode="preview"
            manageToken={card.id}
            blockReadiness={blockReadiness}
          />}
    </>
  );

  return showOpening ? (
    <GiftIntro
      recipientName={presentation.model.recipientName}
      templateId={card.templateId ?? undefined}
      templateTheme={card.templateTheme}
      animationId="winter-wonder"
      previewScene={presentation.kind === "universal-v1" ? getGiftIntroScene(presentation.dispatch.registration.profile) : undefined}
    >
      {preview}
    </GiftIntro>
  ) : preview;
}
