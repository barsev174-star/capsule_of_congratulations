import { notFound } from "next/navigation";
import { listCardDrafts, listCardMediaAssetsByCardId, listContributionsByCardId } from "@/lib/cards/repository";
import { cardTemplates } from "@/lib/cards/templates";
import { FinalCard } from "@/components/final-card/final-card";
import { GiftIntro, GiftPlaceholder } from "@/components/gift-intro/gift-intro";
import { buildFinalCardViewModel } from "@/lib/final-card/view-model";

type Props = {
  params: Promise<{
    finalSlug: string;
  }>;
  searchParams: Promise<{
    debugAssets?: string;
    forceIntro?: string;
  }>;
};

const isCardPublished = (status: string) => status === "ready" || status === "closed";

export default async function GiftPage({ params, searchParams }: Props) {
  const [{ finalSlug }, { debugAssets, forceIntro }] = await Promise.all([params, searchParams]);
  const cards = await listCardDrafts();
  const card = cards.find((item) => item.finalSlug === finalSlug);

  if (!card) {
    notFound();
  }

  const [contributions, mediaAssets] = await Promise.all([
    listContributionsByCardId(card.id),
    listCardMediaAssetsByCardId(card.id)
  ]);
  const template = cardTemplates.find((item) => item.id === card.templateId);
  const model = buildFinalCardViewModel(card, contributions, mediaAssets);
  const isAssetDebugEnabled = process.env.NODE_ENV === "development" && debugAssets === "1";
  const isForceIntroEnabled = process.env.NODE_ENV === "development" && forceIntro === "1";
  const published = isCardPublished(card.status) || isForceIntroEnabled;

  if (!published) {
    return <GiftPlaceholder recipientName={card.recipientName} />;
  }

  return (
    <GiftIntro
      slug={finalSlug}
      recipientName={card.recipientName}
      templateId={card.templateId}
      accent={template?.accent}
      forceIntro={isForceIntroEnabled}
    >
      <FinalCard model={model} debugAssets={isAssetDebugEnabled} />
    </GiftIntro>
  );
}
