export type GiftAnimationId = "envelope" | "collect-messages";

export type GiftAnimation = {
  id: GiftAnimationId;
  name: string;
  description: string;
};

export const giftAnimations: GiftAnimation[] = [
  {
    id: "envelope",
    name: "Конверт с открыткой",
    description: "Конверт открывается, открытка поднимается и раскрывается перед получателем."
  },
  {
    id: "collect-messages",
    name: "Собрать поздравления",
    description: "Поздравления, фотографии и тёплые слова собираются из нескольких чатов в одну открытку."
  }
];

export const defaultGiftAnimationId: GiftAnimationId = "envelope";

export const isGiftAnimationId = (value: string): value is GiftAnimationId =>
  giftAnimations.some((animation) => animation.id === value);
