import { textSimilarity } from "@/lib/ai/response-validation";
import { extractDraftSpecifics, findGenericPhraseIssues, matchDraftSpecifics } from "@/lib/ai/greeting-specifics";
import type { AiGenerationInput, AiStyle, AiVariant } from "@/lib/ai/types";

const normalize = (value: string) => value
  .toLocaleLowerCase("ru-RU")
  .replace(/ё/g, "е")
  .replace(/\s+/g, " ")
  .trim();

const moneyPattern = /зарплат|доход|оплат|платят|платили|вознагражден|оцен(?:ят|или)\s+труд/iu;
const careerPattern = /работ|карьер|професси|должност|развива|рост|мест[оае],?\s+где\s+ценят|дел[оае]\s+по\s+душе/iu;
const gratitudePattern = /спасибо|благодар|ценю|многое\s+значил|помощ|поддерж/iu;
const hrPattern = /достойн\p{L}*\s+(?:доход|оплат)|стабильн\p{L}*\s+доход|профессиональн\p{L}*\s+развити|карьерн\p{L}*\s+движени|признани|уверенност\p{L}*\s+в\s+будущ/iu;
const awkwardHumorPattern = /будильник|платит\s+вовремя|диплом\s+немного|головн\p{L}*\s+бол|без\s+тормозов/iu;
const inventedObjectPattern = /спис(?:ывать|ывал|ывала)|шпаргал|экзамен|зач[её]т|будильник|кофе|начальник|преми/iu;
const gratitudeSourcePattern = /спасибо|благодар|помог|поддерж|выруч|ценю/iu;
const humorSignalPattern = /(?:шут|улыб|хотя\s+бы|теперь\s+можно|кажется|похоже)|[—-][^.!?]*(?:зато|но)/iu;
const resumePattern = /резюме|командн\p{L}*\s+игрок|HR|эйчар|профессиональн|ответственност/iu;
const stiffGratitudePattern = /выража\p{L}*\s+благодарност|искренне\s+благодар|профессиональност/iu;
const awkwardLanguagePatterns = [
  /ценят[^.!?]{0,45}\s+и\s+мест[оае](?!\p{L})/iu,
  /да(?:ют|ст)\s+спокойств/iu,
  /профессиональност/iu,
  /;\s*(?:с\s+\p{L}+|пусть|желаю|найд[её]ш)/iu
];
const peerRelationshipPattern = /сокурс|однокурс|друг|подруг|коллег|брат|сестр/iu;
const peerFormalPattern = /искренн\p{L}*\s+благодарност|выража\p{L}*\s+благодарност|благодарю\s+за\s+тво|поздравляю\s+с[^.!?]{0,35}\s+и\s+желаю|профессиональност/iu;
const wishDirectionPatterns = [
  /ценят\p{L}*\s+(?:(?:твой|ваш)\s+)?(?:труд|работ|ответственност)|мест\p{L}*\s+где[^.!?]{0,40}ценят|люд\p{L}*[^.!?]{0,35}ценят|по-настоящему\s+ценят|интересн\p{L}*[^.!?]{0,25}ценят/iu,
  /хорош\p{L}*\s+старт|легк\p{L}*\s+старт/iu,
  /мест\p{L}*\s+где[^.!?]{0,30}интересн/iu,
  /спокойств|уверенност[^.!?]{0,25}(?:этап|будущ)/iu,
  /складыва\p{L}*\s+по\s+делу/iu
];

const opening = (text: string) => normalize(text).split(/[.!?—,:]/u)[0]?.slice(0, 52) ?? "";
const words = (text: string) => normalize(text).replace(/[^\p{L}\p{N}\s]/gu, " ").split(/\s+/).filter(Boolean);

export type OccasionPlacement = "start" | "middle" | "end" | "absent";

export const getOccasionPlacement = (text: string, occasionText?: string): OccasionPlacement => {
  const occasion = normalize(occasionText ?? "").replace(/[.!?]+$/u, "");
  if (!occasion) return "absent";
  const normalizedText = normalize(text);
  const index = normalizedText.indexOf(occasion);
  if (index < 0) return "absent";
  if (index <= Math.max(18, normalizedText.length * 0.2)) return "start";
  if (index >= normalizedText.length * 0.72) return "end";
  return "middle";
};

export const analyzeGreetingStructure = (
  variant: AiVariant,
  input: Partial<Pick<AiGenerationInput, "recipientName" | "occasionText">>
) => {
  const text = normalize(variant.text);
  const firstWords = words(variant.text).slice(0, 5);
  const recipientFirstName = normalize(input.recipientName ?? "").split(/\s+/)[0];
  return {
    startsWithName: Boolean(recipientFirstName) && firstWords[0] === recipientFirstName,
    thanksEarly: firstWords.some((word) => /спасибо|благодар/iu.test(word)),
    occasionPlacement: getOccasionPlacement(variant.text, input.occasionText),
    endsWithWish: /(?:^|[.!?]\s*)пусть\b[^.!?]*[.!?]?$/iu.test(text) || /(?:желаю|надеюсь)\b[^.!?]*[.!?]?$/iu.test(text),
    finalWords: words(variant.text).slice(-6).join(" ")
  };
};

export const scoreStructureDiversity = (
  variants: AiVariant[],
  input: Partial<Pick<AiGenerationInput, "recipientName" | "occasionText">>
) => {
  const structures = variants.map((variant) => analyzeGreetingStructure(variant, input));
  const issues: string[] = [];
  let score = 100;
  const penalize = (amount: number, issue: string) => { score -= amount; issues.push(issue); };
  const all = (predicate: (structure: typeof structures[number]) => boolean) => structures.every(predicate);
  const occasionCount = structures.filter((structure) => structure.occasionPlacement !== "absent").length;
  const uniquePlacements = new Set(structures.map((structure) => structure.occasionPlacement)).size;

  if (all((structure) => structure.startsWithName)) penalize(18, "ALL_START_WITH_NAME");
  if (all((structure) => structure.thanksEarly)) penalize(24, "REPETITIVE_EARLY_THANKS");
  if (all((structure) => structure.endsWithWish)) penalize(22, "REPETITIVE_WISH_ENDING");
  if (occasionCount > 2) penalize(42, "OCCASION_REPEATED_IN_ALL");
  if (occasionCount > 1 && uniquePlacements === 1) penalize(20, "REPETITIVE_OCCASION_PLACEMENT");
  if (new Set(structures.map((structure) => structure.finalWords)).size === 1) penalize(30, "REPETITIVE_ENDING");

  return { score, issues, occasionCount, structures };
};

export const scoreGreetingVariant = (
  variant: AiVariant,
  input: Pick<AiGenerationInput, "draftNotes" | "style"> & Partial<Pick<AiGenerationInput, "relationshipContext" | "recipientName" | "occasionText">>
) => {
  const text = normalize(variant.text);
  let score = 100;
  const softIssues: string[] = [];
  const tags: string[] = [];
  const specifics = extractDraftSpecifics(input.draftNotes);
  const matchedStrongDetails = matchDraftSpecifics(variant.text, specifics);
  const genericPhraseIssues = findGenericPhraseIssues(variant.text);
  let specificityScore = 0;
  const penalize = (amount: number, issue: string) => {
    score -= amount;
    softIssues.push(issue);
  };
  if (hrPattern.test(text)) score -= 24;
  if (hrPattern.test(text)) softIssues.push("HR_TONE");
  if (moneyPattern.test(text)) { penalize(10, "MONEY_THEME"); tags.push("money"); }
  if (careerPattern.test(text)) { penalize(7, "CAREER_THEME"); tags.push("career"); }
  if (gratitudePattern.test(text)) tags.push("gratitude");
  if (gratitudeSourcePattern.test(normalize(input.draftNotes)) && !gratitudePattern.test(text)) penalize(18, "MISSING_GRATITUDE");
  if (variant.id === "short" && variant.text.length > 180) penalize(60, "SHORT_TOO_LONG");
  if (variant.id === "short" && variant.text.split(/[.!?]+/).filter(Boolean).length > 2) penalize(20, "SHORT_TOO_MANY_SENTENCES");
  if (input.style === "humor" && variant.id === "style") {
    if (awkwardHumorPattern.test(text)) penalize(35, "AWKWARD_HUMOR");
    if (!humorSignalPattern.test(text)) penalize(12, "WEAK_HUMOR");
    if (careerPattern.test(text) || moneyPattern.test(text) || resumePattern.test(text)) penalize(38, "HUMOR_WORK_THEME");
  }
  if (input.style === "warm-simple" && variant.id === "style") {
    if (humorSignalPattern.test(text) || resumePattern.test(text)) penalize(35, "WARM_SIMPLE_STYLE_MISMATCH");
  }
  if (input.style === "short-no-pathos" && variant.id === "style" && variant.text.length > 180) {
    penalize(28, "SHORT_STYLE_TOO_LONG");
  }
  if (
    input.style === "respectful" &&
    variant.id === "style" &&
    peerRelationshipPattern.test(input.relationshipContext ?? "") &&
    stiffGratitudePattern.test(text)
  ) {
    penalize(30, "STIFF_GRATITUDE");
  }
  if (peerRelationshipPattern.test(input.relationshipContext ?? "") && peerFormalPattern.test(text)) {
    penalize(34, "TOO_OFFICIAL_FOR_PEER");
  }
  if (inventedObjectPattern.test(text) && !inventedObjectPattern.test(normalize(input.draftNotes))) penalize(45, "INVENTED_DETAIL");
  if (awkwardLanguagePatterns.some((pattern) => pattern.test(text))) penalize(32, "AWKWARD_LANGUAGE");
  if (/^[–—-]/u.test(variant.text.trim())) penalize(3, "LEADING_DASH");
  for (const detail of matchedStrongDetails) {
    const bonus = detail === "author-impact" ? 30 : detail === "period" ? 16 : detail.endsWith("action") ? 14 : 8;
    specificityScore += bonus;
  }
  if (input.style === "humor" && variant.id === "style" && matchedStrongDetails.includes("author-impact")) {
    specificityScore += 18;
    tags.push("humor-personal-consequence");
  }
  if (specifics.strongDetails.length > 0 && matchedStrongDetails.length === 0) {
    penalize(16, "MISSING_DRAFT_SPECIFICS");
  }
  for (const issue of genericPhraseIssues) {
    specificityScore -= 12;
    softIssues.push(`TOO_GENERIC:${issue}`);
  }
  score += specificityScore;
  return {
    score,
    hardErrors: [] as string[],
    softIssues,
    tags,
    specificityScore,
    matchedStrongDetails,
    genericPhraseIssues
  };
};

export const scoreGreetingSelection = (
  variants: AiVariant[],
  input: Pick<AiGenerationInput, "draftNotes" | "style"> & Partial<Pick<AiGenerationInput, "relationshipContext" | "recipientName" | "occasionText">>
) => {
  let score = variants.reduce((total, variant) => total + scoreGreetingVariant(variant, input).score, 0);
  const moneyCount = variants.filter((variant) => moneyPattern.test(normalize(variant.text))).length;
  const careerCount = variants.filter((variant) => careerPattern.test(normalize(variant.text))).length;
  const gratitudeCount = variants.filter((variant) => gratitudePattern.test(normalize(variant.text))).length;
  const repeatedWishDirections = wishDirectionPatterns.filter(
    (pattern) => variants.filter((variant) => pattern.test(normalize(variant.text))).length > 1
  ).length;

  if (moneyCount > 1) score -= (moneyCount - 1) * 45;
  if (careerCount > 1) score -= (careerCount - 1) * 24;
  if (gratitudePattern.test(normalize(input.draftNotes)) && gratitudeCount < 2) score -= (2 - gratitudeCount) * 22;
  score -= repeatedWishDirections * 55;
  const specificity = variants.map((variant) => scoreGreetingVariant(variant, input));
  const variantsWithSpecifics = specificity.filter((result) => result.matchedStrongDetails.length > 0).length;
  if (extractDraftSpecifics(input.draftNotes).strongDetails.length > 0 && variantsWithSpecifics < 2) {
    score -= (2 - variantsWithSpecifics) * 38;
  }
  const repeatedSpecifics = new Map<string, number>();
  for (const result of specificity) {
    for (const detail of result.matchedStrongDetails) {
      repeatedSpecifics.set(detail, (repeatedSpecifics.get(detail) ?? 0) + 1);
    }
  }
  for (const count of repeatedSpecifics.values()) {
    if (count > 2) score -= 18;
  }
  score += scoreStructureDiversity(variants, input).score - 100;

  for (let left = 0; left < variants.length; left += 1) {
    for (let right = left + 1; right < variants.length; right += 1) {
      if (textSimilarity(variants[left].text, variants[right].text) >= 0.72) score -= 35;
      if (opening(variants[left].text) === opening(variants[right].text)) score -= 18;
    }
  }
  return score;
};

export const rankGreetingSelections = (
  selections: AiVariant[][],
  input: Pick<AiGenerationInput, "draftNotes" | "style"> & Partial<Pick<AiGenerationInput, "relationshipContext" | "recipientName" | "occasionText">>
) => {
  const topicConstrained = selections.filter((selection) => {
    const moneyCount = selection.filter((variant) => moneyPattern.test(normalize(variant.text))).length;
    const careerCount = selection.filter((variant) => careerPattern.test(normalize(variant.text))).length;
    return moneyCount <= 1 && careerCount <= 2;
  });
  const candidates = topicConstrained.length ? topicConstrained : selections;
  const draftHasPersonalConsequence = extractDraftSpecifics(input.draftNotes).personalConsequences.length > 0;
  const withPersonalConsequence = draftHasPersonalConsequence
    ? candidates.filter((selection) => selection.some((variant) =>
        scoreGreetingVariant(variant, input).matchedStrongDetails.includes("author-impact")
      ))
    : [];
  const prioritized = withPersonalConsequence.length ? withPersonalConsequence : candidates;
  return [...prioritized].sort(
    (left, right) => scoreGreetingSelection(right, input) - scoreGreetingSelection(left, input)
  );
};

export const selectionHasRepeatedMoneyTheme = (variants: AiVariant[]) =>
  variants.filter((variant) => moneyPattern.test(normalize(variant.text))).length > 1;
