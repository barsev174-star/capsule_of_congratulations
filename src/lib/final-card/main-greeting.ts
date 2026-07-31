import type { CardDraft, Contribution } from "@/lib/cards/types";

/**
 * Explicit selection is the source of truth for current cards. Before it was
 * persisted, delivered cards used the first visible greeting as the summary.
 */
export const resolveMainGreetingContribution = <T extends Pick<Contribution, "id">>(
  card: Pick<CardDraft, "deliveryStatus" | "finalMainGreetingSettings">,
  visibleContributions: T[]
) => {
  const selectedId = card.finalMainGreetingSettings?.contributionId;
  const selected = selectedId
    ? visibleContributions.find((contribution) => contribution.id === selectedId) ?? null
    : null;

  if (selected) return selected;
  return card.deliveryStatus === "DELIVERED" ? visibleContributions[0] ?? null : null;
};
