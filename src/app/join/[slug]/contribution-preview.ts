const PREVIEW_WORD_LIMIT = 3;
const PREVIEW_CHARACTER_LIMIT = 32;

export const buildContributionPreview = (message: string) => {
  const normalized = message.replace(/\s+/g, " ").trim();
  if (!normalized) return "";

  const words = normalized.split(" ");
  const firstWords = words.slice(0, PREVIEW_WORD_LIMIT).join(" ");
  const characters = Array.from(firstWords);
  const preview = characters.length > PREVIEW_CHARACTER_LIMIT
    ? characters.slice(0, PREVIEW_CHARACTER_LIMIT).join("").trimEnd()
    : firstWords;

  if (preview === normalized) return preview;
  return `${preview.replace(/[,.!?;:—-]+$/u, "").trimEnd()}…`;
};
