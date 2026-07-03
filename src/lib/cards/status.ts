import type { CardDraft } from "@/lib/cards/types";

export type PublicationMode = "free" | "paid";

export const getPublicationMode = (): PublicationMode =>
  process.env.PUBLICATION_MODE === "paid" ? "paid" : "free";

export const isFreePublicationEnabled = (): boolean => getPublicationMode() === "free";

export const isGiftPublished = (
  card: Pick<CardDraft, "status" | "paymentStatus">,
  mode: PublicationMode = getPublicationMode()
): boolean => card.status === "published" && (mode === "free" || card.paymentStatus === "paid");
