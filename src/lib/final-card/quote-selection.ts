import { isValidBestQuoteText } from "@/lib/ai/card-insights";
import type { CardDraft } from "@/lib/cards/types";

export const resolveFinalBestQuotes = (
  card: Pick<CardDraft, "deliveryStatus">,
  candidates: string[],
  selectedQuotes: string[]
) => {
  const candidateSet = new Set(candidates);
  const hasThreeValidSelectedQuotes =
    selectedQuotes.length === 3 &&
    selectedQuotes.every((quote) => isValidBestQuoteText(quote) && candidateSet.has(quote));
  if (hasThreeValidSelectedQuotes) {
    return { quotes: selectedQuotes, usesLegacyDefault: false };
  }

  const legacyDefault = candidates.slice(0, 3);
  const isLegacySavedSelection = candidates.length === 3;
  if (
    (isLegacySavedSelection || card.deliveryStatus === "DELIVERED") &&
    legacyDefault.length === 3 &&
    legacyDefault.every(isValidBestQuoteText)
  ) {
    return { quotes: legacyDefault, usesLegacyDefault: true };
  }

  return { quotes: [], usesLegacyDefault: false };
};
