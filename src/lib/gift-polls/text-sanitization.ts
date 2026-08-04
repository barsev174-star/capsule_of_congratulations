const namedEntities: Record<string, string> = {
  amp: "&",
  apos: "'",
  gt: ">",
  lt: "<",
  nbsp: " ",
  quot: '"',
  rub: "₽"
};

export const decodeHtmlEntities = (value: string) => value.replace(
  /&(?:#(\d+)|#x([\da-f]+)|([a-z][\da-z]+));?/gi,
  (entity, decimal: string | undefined, hexadecimal: string | undefined, named: string | undefined) => {
    if (decimal) {
      const codePoint = Number(decimal);
      return Number.isFinite(codePoint) && codePoint > 0 && codePoint <= 0x10ffff ? String.fromCodePoint(codePoint) : entity;
    }
    if (hexadecimal) {
      const codePoint = Number.parseInt(hexadecimal, 16);
      return Number.isFinite(codePoint) && codePoint > 0 && codePoint <= 0x10ffff ? String.fromCodePoint(codePoint) : entity;
    }
    return namedEntities[named?.toLowerCase() ?? ""] ?? entity;
  }
);

export const sanitizeGiftPollText = (value: string | null | undefined, maxLength: number) => {
  if (!value) return "";
  return decodeHtmlEntities(value)
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength)
    .trim();
};

export const cleanImportedDescription = (value: string | null | undefined, title?: string | null) => {
  let cleaned = sanitizeGiftPollText(value, 320);
  const normalizedTitle = sanitizeGiftPollText(title, 120);
  if (normalizedTitle && cleaned.toLocaleLowerCase("ru-RU").startsWith(normalizedTitle.toLocaleLowerCase("ru-RU"))) {
    cleaned = cleaned.slice(normalizedTitle.length).replace(/^[\s·|—–:-]+/, "");
  }
  cleaned = cleaned
    .replace(/\s+(?:купить|заказать)(?:\s|$).*$/i, "")
    .replace(/\s+по\s+цене(?:\s|$).*$/i, "")
    .replace(/\b(?:купить|цена|доставка|отзывы|характеристики)\b(?:\s+в\s+[А-ЯЁA-Z][^|·]{0,45})?/gi, " ")
    .replace(/\s*[|·]\s*(?:интернет-магазин|официальный сайт|маркетплейс).*$/i, "")
    .replace(/\s+/g, " ")
    .trim();
  return cleaned.slice(0, 140).trim();
};
