export type CardPaymentStatus = "UNPAID" | "PAID" | "REFUNDED" | "REVOKED";
export type CollectionStatus = "DRAFT" | "OPEN" | "CLOSED";
export type DeliveryStatus = "PREPARING" | "DELIVERED";

export type CardLifecycle = {
  paymentStatus: CardPaymentStatus;
  collectionStatus: CollectionStatus;
  deliveryStatus: DeliveryStatus;
  activePaidOrderId: string | null;
  isHidden: boolean;
  deletedAt: string | null;
  purgedAt: string | null;
};

export class CardLifecycleConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CardLifecycleConflictError";
  }
}

export const isPurged = (card: Pick<CardLifecycle, "purgedAt">) => card.purgedAt !== null;

export const isContentLocked = (card: Pick<CardLifecycle, "deliveryStatus">) =>
  card.deliveryStatus === "DELIVERED";

export const canEditContent = (card: Pick<CardLifecycle, "deliveryStatus" | "purgedAt">) =>
  card.deliveryStatus === "PREPARING" && card.purgedAt === null;

export const canJoinCollection = (card: Pick<CardLifecycle, "collectionStatus" | "deliveryStatus" | "purgedAt">) =>
  card.collectionStatus === "OPEN" && card.deliveryStatus === "PREPARING" && card.purgedAt === null;

export const canDeliverCard = (
  card: Pick<CardLifecycle, "paymentStatus" | "collectionStatus" | "deliveryStatus" | "purgedAt">
) =>
  card.paymentStatus === "PAID" &&
  card.collectionStatus === "CLOSED" &&
  card.deliveryStatus === "PREPARING" &&
  card.purgedAt === null;

export const isGiftAccessible = (card: CardLifecycle) =>
  card.deliveryStatus === "DELIVERED" &&
  card.paymentStatus === "PAID" &&
  card.activePaidOrderId !== null &&
  !card.isHidden &&
  card.deletedAt === null &&
  card.purgedAt === null;

export const assertCardContentEditable = (card: Pick<CardLifecycle, "deliveryStatus" | "purgedAt">) => {
  if (card.purgedAt !== null) {
    throw new CardLifecycleConflictError("Открытка окончательно очищена и недоступна.");
  }

  if (card.deliveryStatus === "DELIVERED") {
    throw new CardLifecycleConflictError("Открытка уже передана получателю и больше не может быть изменена.");
  }
};

export const assertCanOpenCollection = (
  card: Pick<CardLifecycle, "collectionStatus" | "deliveryStatus" | "purgedAt">
) => {
  if (card.purgedAt !== null || card.deliveryStatus !== "PREPARING" || card.collectionStatus === "OPEN") {
    throw new CardLifecycleConflictError("Сбор поздравлений нельзя открыть в текущем состоянии.");
  }
};

export const assertCanCloseCollection = (
  card: Pick<CardLifecycle, "collectionStatus" | "deliveryStatus" | "purgedAt">
) => {
  if (card.purgedAt !== null || card.deliveryStatus !== "PREPARING" || card.collectionStatus !== "OPEN") {
    throw new CardLifecycleConflictError("Сбор поздравлений уже закрыт.");
  }
};

export const assertCanDeliverCard = (
  card: Pick<CardLifecycle, "paymentStatus" | "collectionStatus" | "deliveryStatus" | "purgedAt">
) => {
  if (card.deliveryStatus === "DELIVERED") {
    return;
  }

  if (!canDeliverCard(card)) {
    throw new CardLifecycleConflictError("Передача доступна только после подтверждённой оплаты и закрытия сбора.");
  }
};

export const getCardLifecycleLabel = (
  card: Pick<CardLifecycle, "paymentStatus" | "collectionStatus" | "deliveryStatus">
) => {
  if (card.paymentStatus === "REVOKED") return "Доступ приостановлен";
  if (card.deliveryStatus === "DELIVERED" && card.paymentStatus === "REFUNDED") return "Доступ приостановлен";
  if (card.deliveryStatus === "DELIVERED") return "Передана получателю";
  if (card.collectionStatus === "CLOSED" && card.paymentStatus === "PAID") return "Готова к передаче";
  if (card.collectionStatus === "CLOSED") return "Финальная подготовка";
  if (card.collectionStatus === "OPEN") return "Сбор поздравлений открыт";
  return "Черновик";
};
