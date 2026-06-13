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

const styles: AiStyle[] = ["warm-simple", "short-no-pathos", "humor", "touching", "respectful"];
const occasions = ["personal", "team", "celebration", "teacher", "caregiver", "colleague"] as const;

export const validateAiGenerationFormData = (formData: FormData): AiValidationResult => {
  const issues: AiValidationIssue[] = [];

  const cardId = normalizeText(formData.get("cardId"));
  const recipientName = normalizeText(formData.get("recipientName"));
  const occasion = normalizeText(formData.get("occasion"));
  const occasionText = normalizeText(formData.get("occasionText"));
  const draftNotes = normalizeText(formData.get("draftNotes"));
  const style = normalizeText(formData.get("style"));

  if (!cardId) {
    issues.push({ field: "cardId", message: "Не удалось определить открытку для AI-помощника." });
  }

  if (recipientName.length < 2) {
    issues.push({ field: "recipientName", message: "Нужно указать имя получателя." });
  }

  if (!occasions.includes(occasion as (typeof occasions)[number])) {
    issues.push({ field: "occasion", message: "Формат открытки для AI-помощника не распознан." });
  }

  if (occasionText.length < 2) {
    issues.push({ field: "occasionText", message: "Нужен короткий контекст: кого и по какому поводу поздравляют." });
  }

  if (draftNotes.length < 12) {
    issues.push({
      field: "draftNotes",
      message: "Напишите хотя бы пару мыслей своими словами: что цените и что хотите пожелать."
    });
  }

  if (!styles.includes(style as AiStyle)) {
    issues.push({ field: "style", message: "Выберите стиль поздравления." });
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
      occasionText,
      draftNotes,
      style: style as AiStyle
    }
  };
};
