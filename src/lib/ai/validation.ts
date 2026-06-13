import type { AiGenerationInput, AiStyle } from "@/lib/ai/types";

export type AiValidationIssue = {
  field: string;
  message: string;
};

export type AiValidationResult =
  | { success: true; data: AiGenerationInput }
  | { success: false; issues: AiValidationIssue[] };

const normalizeText = (value: FormDataEntryValue | null) =>
  typeof value === "string" ? value.trim() : "";

const normalizeMultiValue = (values: FormDataEntryValue[]) =>
  values
    .map((value) => (typeof value === "string" ? value.trim() : ""))
    .filter(Boolean);

const styles: AiStyle[] = ["warm-simple", "short-no-pathos", "humor", "touching", "respectful"];
const occasions = ["teacher", "caregiver", "colleague"] as const;

export const validateAiGenerationFormData = (formData: FormData): AiValidationResult => {
  const issues: AiValidationIssue[] = [];

  const cardId = normalizeText(formData.get("cardId"));
  const recipientName = normalizeText(formData.get("recipientName"));
  const occasion = normalizeText(formData.get("occasion"));
  const relation = normalizeText(formData.get("relation"));
  const qualities = normalizeMultiValue(formData.getAll("qualities"));
  const wishes = normalizeMultiValue(formData.getAll("wishes"));
  const personalDetail = normalizeText(formData.get("personalDetail"));
  const style = normalizeText(formData.get("style"));

  if (!cardId) {
    issues.push({ field: "cardId", message: "Не удалось определить открытку для AI-генерации." });
  }

  if (recipientName.length < 2) {
    issues.push({ field: "recipientName", message: "Нужно указать имя получателя." });
  }

  if (!occasions.includes(occasion as (typeof occasions)[number])) {
    issues.push({ field: "occasion", message: "Повод для AI-помощника не распознан." });
  }

  if (relation.length < 2) {
    issues.push({ field: "relation", message: "Укажите, кем вам приходится этот человек." });
  }

  if (qualities.length === 0) {
    issues.push({ field: "qualities", message: "Выберите хотя бы одну черту человека." });
  }

  if (wishes.length === 0) {
    issues.push({ field: "wishes", message: "Выберите хотя бы одно пожелание." });
  }

  if (!styles.includes(style as AiStyle)) {
    issues.push({ field: "style", message: "Выберите стиль поздравления." });
  }

  if (personalDetail && personalDetail.length < 5) {
    issues.push({ field: "personalDetail", message: "Если добавляете личную деталь, пусть она будет чуть конкретнее." });
  }

  if (issues.length > 0) {
    return { success: false, issues };
  }

  return {
    success: true,
    data: {
      cardId,
      recipientName,
      occasion: occasion as AiGenerationInput["occasion"],
      relation,
      qualities,
      wishes,
      personalDetail: personalDetail || undefined,
      style: style as AiStyle
    }
  };
};
