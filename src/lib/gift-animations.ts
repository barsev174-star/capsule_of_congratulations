export type GiftAnimationId = "envelope" | "collect-messages";

export type GiftAnimation = {
  id: GiftAnimationId;
  name: string;
  description: string;
};

export const giftAnimations: GiftAnimation[] = [
  {
    id: "envelope",
    name: "Конверт",
    description: "Классическое открытие: конверт раскрывается и показывает открытку."
  },
  {
    id: "collect-messages",
    name: "Собрать поздравления",
    description: "Поздравления и фото собираются в открытку прямо на глазах."
  }
];

export const defaultGiftAnimationId: GiftAnimationId = "envelope";

export const isGiftAnimationId = (value: string): value is GiftAnimationId =>
  giftAnimations.some((animation) => animation.id === value);
