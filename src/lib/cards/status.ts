import type { CardDraft } from "@/lib/cards/types";

export const isGiftPublished = (card: Pick<CardDraft, "status" | "paymentStatus">): boolean =>
  card.status === "published" && card.paymentStatus === "paid";
