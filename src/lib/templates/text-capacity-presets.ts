export type UniversalTextCapacityPreset = {
  maxChars: number;
  maxLines: number;
  overflow: "clip" | "ellipsis" | "fit-then-ellipsis";
};

export const universalTextCapacityPresets = {
  recipientName: {
    maxChars: 80,
    maxLines: 2,
    overflow: "fit-then-ellipsis"
  },
  messageCard: {
    maxChars: 340,
    maxLines: 5,
    overflow: "ellipsis"
  },
  photoCaption: {
    maxChars: 45,
    maxLines: 2,
    overflow: "ellipsis"
  },
  qualityCard: {
    maxChars: 28,
    maxLines: 2,
    overflow: "ellipsis"
  },
  quoteCard: {
    maxChars: 100,
    maxLines: 4,
    overflow: "clip"
  }
} as const satisfies Record<string, UniversalTextCapacityPreset>;

export type UniversalRecipientNameTier = "default" | "long" | "very-long";

const russianPatronymicPattern = /(?:ович|евич|ич|овна|евна|ична|инична)$/iu;

export const getUniversalRecipientNameLines = (value: string): readonly string[] => {
  const normalized = value.trim().replace(/\s+/g, " ");
  const parts = normalized.split(" ");

  return parts.length === 2 && russianPatronymicPattern.test(parts[1])
    ? parts
    : [normalized];
};

export const getUniversalRecipientNameTier = (value: string): UniversalRecipientNameTier => {
  const length = value.trim().length;
  if (length > 40) return "very-long";
  if (getUniversalRecipientNameLines(value).length > 1) return "long";
  if (length > 18) return "long";
  return "default";
};

export const getUniversalQuoteLengthScale = (value: string) => {
  const length = value.trim().replace(/\s+/g, " ").length;
  if (length > 90) return .72;
  if (length > 80) return .78;
  if (length > 65) return .88;
  return 1;
};

export const getUniversalPhotoCaptionScale = (value: string, minScale: number) => {
  const length = value.trim().replace(/\s+/g, " ").length;
  const fullScaleLimit = 28;
  const hardLimit = universalTextCapacityPresets.photoCaption.maxChars;
  const floor = Math.min(1, Math.max(.5, minScale));

  if (length <= fullScaleLimit) return 1;
  if (length >= hardLimit) return floor;

  const progress = (length - fullScaleLimit) / (hardLimit - fullScaleLimit);
  return Number((1 - progress * (1 - floor)).toFixed(3));
};
