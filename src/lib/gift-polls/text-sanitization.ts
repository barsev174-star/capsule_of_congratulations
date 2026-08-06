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

// Decodes entities, removes markup and invisible/control characters, collapses whitespace.
const stripMarkup = (value: string) => decodeHtmlEntities(value)
  .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
  .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
  .replace(/<[^>]+>/g, " ")
  .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f\u00ad\u200b\u200c\u200d\ufeff]/g, " ")
  .replace(/\s+/g, " ")
  .trim();

const trailingJunk = /[\s,;:.|»«—–\-]+$/;
const leadingJunk = /^[\s,;:.|»«—–\-]+/;

// Truncates at a word boundary. Input is expected to be entity-decoded already,
// so a cut can never land inside an HTML entity or a Unicode code point.
const truncateAtWord = (value: string, maxLength: number) => {
  if (value.length <= maxLength) return value.replace(trailingJunk, "").trim();
  const cut = value.slice(0, maxLength + 1);
  const lastSpace = cut.lastIndexOf(" ");
  const bounded = lastSpace > 0 ? cut.slice(0, lastSpace) : cut.slice(0, maxLength);
  return bounded.replace(trailingJunk, "").trim();
};

export const sanitizeGiftPollText = (value: string | null | undefined, maxLength: number) => {
  if (!value) return "";
  return truncateAtWord(stripMarkup(value), maxLength);
};

const seoSegmentPattern = /купить|заказать|цена|стоимость|доставк|самовывоз|скидк|отзыв|характеристик|интернет-магазин|официальный|маркетплейс|недорого|гарантия|в\s+наличии|с\s+доставкой/i;
const regionSegmentPattern = /(?:^|\s)в\s+(?:Москве|Челябинске|Питере|Санкт-Петербурге|Екатеринбурге|Новосибирске|Казани|Краснодаре|Самаре|Уфе|Воронеже|Перми|Ростове|Волгограде|Красноярске|Тюмени|Тольятти|Ижевске|Барнауле|Иркутске|Хабаровске|Владивостоке|Ярославле|Томске|Оренбурге|Рязани|Пензе|Липецке|Туле|Курске|Чебоксарах|Калининграде|Ставрополе|Улан-Удэ|Брянске|Иваново|Магнитогорске|Сочи|Нижнем\s+Новгороде|Набережных\s+Челнах)\b/i;
const priceOnlySegmentPattern = /^(?:от\s+)?[\d\s.,]+\s*(?:₽|руб\.?(?![а-яё])|р\.|%)?$/i;

type TitleContext = { storeName?: string | null; hostname?: string | null };

const isServiceSegment = (segment: string, context: TitleContext, isFirst: boolean) => {
  const lower = segment.toLocaleLowerCase("ru-RU");
  const storeName = context.storeName?.trim().toLocaleLowerCase("ru-RU");
  if (storeName && (lower === storeName || (!isFirst && lower.endsWith(storeName)))) return true;
  const host = context.hostname?.replace(/^www\./, "").toLowerCase();
  const hostRoot = host?.split(".")[0] ?? "";
  if (host && (lower.includes(host) || (hostRoot.length > 3 && lower === hostRoot))) return true;
  if (priceOnlySegmentPattern.test(segment)) return true;
  if (seoSegmentPattern.test(segment) || regionSegmentPattern.test(segment)) return true;
  return false;
};

const dedupeRepeatedParts = (value: string) => {
  // Collapse immediately repeated tokens: «Аква Аква 2900» → «Аква 2900».
  // (Lookarounds instead of \b — \b does not work with Cyrillic.)
  const collapsed = value.replace(/(^|\s)(\S+)((?:\s+\2)+(?=\s|$))/gi, "$1$2");
  // Drop a duplicated second half: «Аква 2900 Аква 2900» → «Аква 2900».
  const words = collapsed.split(" ");
  if (words.length >= 2 && words.length % 2 === 0) {
    const half = words.length / 2;
    const first = words.slice(0, half).join(" ").toLocaleLowerCase("ru-RU");
    const second = words.slice(half).join(" ").toLocaleLowerCase("ru-RU");
    if (first === second) return words.slice(0, half).join(" ");
  }
  return collapsed;
};

// Normalizes an imported product title: strips markup/entities, removes store-name
// and SEO tails, repeated fragments and service delimiters, then truncates safely.
export const cleanImportedTitle = (value: string | null | undefined, context: TitleContext = {}, maxLength = 60) => {
  const base = stripMarkup(value ?? "")
    // Cut inline SEO and price tails: «Лодка Аква купить в Москве», «…, 40 050 ₽».
    .replace(/\s+(?:купить|заказать)\s.*$/i, "")
    .replace(/\s+(?:за\s+|от\s+)?\d[\d\s]*(?:[.,]\d+)?\s*(?:₽|руб\.?(?![а-яё])|р\.)\s*.*$/i, "")
    .trim();
  if (!base) return "";
  const segments = base.split(/\s*(?:\||»|::|\s[—–-]\s)\s*/).map((segment) => segment.trim()).filter(Boolean);
  const kept = segments
    .map((segment) => segment.replace(/^(?:купить|заказать)\s+/i, "").trim())
    .filter((segment) => segment && !isServiceSegment(segment, context, segments.indexOf(segment) === 0));
  const title = dedupeRepeatedParts((kept.length ? kept : [base]).join(" "))
    .replace(leadingJunk, "")
    .replace(trailingJunk, "")
    .trim();
  return truncateAtWord(title, maxLength);
};

export const cleanImportedDescription = (value: string | null | undefined, title?: string | null) => {
  let cleaned = stripMarkup(value ?? "").slice(0, 640);
  const normalizedTitle = stripMarkup(title ?? "");
  if (normalizedTitle && cleaned.toLocaleLowerCase("ru-RU").startsWith(normalizedTitle.toLocaleLowerCase("ru-RU"))) {
    cleaned = cleaned.slice(normalizedTitle.length).replace(/^[\s·|—–:-]+/, "");
  }
  cleaned = cleaned
    .replace(/(?:^|\s+)(?:купить|заказать)(?:\s|$).*$/i, "")
    .replace(/(?:^|\s+)по\s+цене(?:\s|$).*$/i, "")
    .replace(/(^|\s)(?:купить|цена|доставка|отзывы|характеристики)(?=\s|$|[,.])(?:\s+в\s+[А-ЯЁA-Z][^|·]{0,45})?/gi, "$1")
    .replace(/\s*[|·]\s*(?:интернет-магазин|официальный сайт|маркетплейс).*$/i, "")
    .replace(/\s+/g, " ")
    .trim();
  // Remove repeated sentences.
  const seen = new Set<string>();
  const sentences = cleaned.split(/(?<=[.!?])\s+/).filter((sentence) => {
    const key = sentence.toLocaleLowerCase("ru-RU");
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  cleaned = sentences.join(" ");
  // A description that is only technical noise is not worth keeping.
  if (cleaned && !/[а-яёa-z]{3,}/i.test(cleaned)) return "";
  return truncateAtWord(cleaned, 140);
};
