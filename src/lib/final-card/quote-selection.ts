import { isValidBestQuoteText } from "@/lib/ai/card-insights";
import type { CardDraft } from "@/lib/cards/types";

export const resolveFinalBestQuotes = (
  card: Pick<CardDraft, "deliveryStatus">,
  candidates: string[],
  areStale: boolean
) => {
  const hasThreeValidQuotes = candidates.length === 3 && candidates.every(isValidBestQuoteText);
  if (hasThreeValidQuotes && !areStale) {
    return { quotes: candidates, usesLegacyDefault: false };
  }

  const legacyDefault = candidates.slice(0, 3);
  if (card.deliveryStatus === "DELIVERED" && legacyDefault.length === 3 && legacyDefault.every(isValidBestQuoteText)) {
    return { quotes: legacyDefault, usesLegacyDefault: true };
  }

  return { quotes: [], usesLegacyDefault: false };
};
