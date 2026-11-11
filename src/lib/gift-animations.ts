export type GiftAnimationId = "envelope" | "collect-messages" | "winter-wonder";
export type WinterGiftTheme = "red" | "green" | "plum";

export const winterWonderTemplateId = "new-year";

export const winterWonderAnimation = {
  id: "winter-wonder",
  name: "Волшебная доставка",
  description: "Сказочная доставка подарка с оленями, снегом и золотым волшебством."
} as const;

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
  },
  winterWonderAnimation
];

export const defaultGiftAnimationId: GiftAnimationId = "envelope";

export const isGiftAnimationId = (value: string): value is GiftAnimationId =>
  giftAnimations.some((animation) => animation.id === value);

export const getDefaultGiftAnimationId = (templateId?: string | null): GiftAnimationId =>
  templateId === winterWonderTemplateId ? winterWonderAnimation.id : defaultGiftAnimationId;

export const getWinterGiftTheme = (templateId?: string | null, theme?: string | null): WinterGiftTheme =>
  templateId === winterWonderTemplateId ? (theme === "green" ? "green" : "red") : "plum";

const newYearGiftAnimations = [winterWonderAnimation, ...giftAnimations.slice(0, 2)];

export const getGiftAnimationsForTemplate = (templateId?: string | null): readonly GiftAnimation[] =>
  templateId === winterWonderTemplateId ? newYearGiftAnimations : giftAnimations;

export const getGiftAnimationNeighbor = (
  animations: readonly GiftAnimation[],
  current: GiftAnimationId,
  key: string
) => {
  const direction = key === "ArrowRight" || key === "ArrowDown" ? 1
    : key === "ArrowLeft" || key === "ArrowUp" ? -1 : 0;
  if (!direction) return undefined;
  const index = animations.findIndex(({ id }) => id === current);
  return animations[(index + direction + animations.length) % animations.length]?.id;
};
