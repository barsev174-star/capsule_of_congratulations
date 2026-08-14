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
    overflow: "ellipsis"
  }
} as const satisfies Record<string, UniversalTextCapacityPreset>;

export type UniversalRecipientNameTier = "default" | "long" | "very-long";

export const getUniversalRecipientNameTier = (value: string): UniversalRecipientNameTier => {
  const length = value.trim().length;
  if (length > 40) return "very-long";
  if (length > 18) return "long";
  return "default";
};

export const getUniversalQuoteLengthScale = (value: string) => {
  const length = value.trim().length;
  if (length > 90) return .86;
  if (length > 80) return .93;
  return 1;
};
