import { textSimilarity } from "@/lib/ai/response-validation";
import type {
  AiGenerationInput,
  AiMatrixVariant,
  AiMatrixVariantType,
  AiStyle,
  AiVariant
} from "@/lib/ai/types";
import { AiError } from "@/lib/ai/types";

export type RelationshipInference = {
  relationshipType: "peer" | "official" | "family" | "romantic" | "unknown";
  addressMode: "tu" | "vy" | "neutral";
  mainFocus: string;
};

const normalize = (value: string) => value.toLocaleLowerCase("ru-RU").replace(/ё/g, "е");

const peerPattern = /сокурсни|однокурсни|подруг|друг|коллег|брат|сестр/iu;
const officialPattern = /учител|воспитател|руководител|начальник|директор|преподавател|клиент/iu;
const familyPattern = /мам|пап|бабуш|дедуш|жен[аы]|муж|доч|сын/iu;
const romanticPattern = /любим|невест|жених|партн[её]р/iu;

const inferType = (value: string): RelationshipInference["relationshipType"] => {
  if (peerPattern.test(value)) return "peer";
  if (officialPattern.test(value)) return "official";
  if (familyPattern.test(value)) return "family";
  if (romanticPattern.test(value)) return "romantic";
  return "unknown";
};

const inferMainFocus = (draftNotes: string) => {
  if (/помог|поддерж|выручил|выручал|благодар/iu.test(draftNotes)) return "личная благодарность";
  if (/учител|воспитател|дети|родители/iu.test(draftNotes)) return "благодарность за заботу и внимание";
  if (/увольнен|переход|прощаемся|прощание/iu.test(draftNotes)) return "благодарность за совместное время";
  if (/день\s+рождени|поздрав/iu.test(draftNotes)) return "поздравление и тёплое пожелание";
  return "тёплое поздравление";
};

export const inferRelationshipContext = (input: Pick<AiGenerationInput, "relationshipContext" | "draftNotes">): RelationshipInference => {
  const explicitContext = normalize(input.relationshipContext ?? "");
  const draft = normalize(input.draftNotes);
  const relationshipType = inferType(explicitContext) === "unknown" ? inferType(draft) : inferType(explicitContext);
  const addressMode = relationshipType === "official"
    ? "vy"
    : relationshipType === "unknown"
      ? "neutral"
      : "tu";

  return { relationshipType, addressMode, mainFocus: inferMainFocus(draft) };
};

const getVariant = (variants: AiMatrixVariant[], type: AiMatrixVariantType) => {
  const variant = variants.find((item) => item.id === type);
  if (!variant) throw new AiError("INVALID_PROVIDER_RESPONSE", `Matrix response is missing ${type}.`);
  return variant;
};

const asPublicVariant = (variant: AiMatrixVariant, id: AiVariant["id"]): AiVariant => ({
  id,
  label: id === "short" ? "Короткий" : id === "warm" ? "Душевный" : "Ваш стиль",
  text: variant.text
});

export const selectMatrixVariants = (variants: AiMatrixVariant[], selectedStyle: AiStyle): AiVariant[] => {
  let short = getVariant(variants, "short");
  let warm = getVariant(variants, "warm");
  const style = getVariant(variants, selectedStyle);

  if (selectedStyle === "short-no-pathos" && textSimilarity(short.text, style.text) >= 0.78) {
    const fallback = getVariant(variants, "warm-simple");
    if (Array.from(fallback.text).length <= 180) short = fallback;
  }
  if (selectedStyle === "warm-simple" && textSimilarity(warm.text, style.text) >= 0.78) {
    warm = getVariant(variants, "touching");
  }

  return [
    asPublicVariant(short, "short"),
    asPublicVariant(warm, "warm"),
    asPublicVariant(style, "style")
  ];
};
