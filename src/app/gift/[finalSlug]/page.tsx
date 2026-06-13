import { notFound } from "next/navigation";
import { listCardDrafts, listContributionsByCardId } from "@/lib/cards/repository";
import { FinalCard } from "@/components/final-card/final-card";
import { buildFinalCardViewModel } from "@/lib/final-card/view-model";

type Props = {
  params: Promise<{
    finalSlug: string;
  }>;
};

export default async function GiftPage({ params }: Props) {
  const { finalSlug } = await params;
  const cards = await listCardDrafts();
  const card = cards.find((item) => item.finalSlug === finalSlug);

  if (!card) {
    notFound();
  }

  const contributions = await listContributionsByCardId(card.id);
  const model = buildFinalCardViewModel(card, contributions);

  return <FinalCard model={model} />;
}
