import {
  getDefaultTemplateForOccasion,
  isOccasionId,
  isTemplateId,
  type OccasionId
} from "@/lib/cards/templates";
import type { CreateCardInput } from "@/lib/cards/types";

export type ValidationIssue = {
  field: string;
  message: string;
};

export type ValidationResult =
  | { success: true; data: CreateCardInput }
  | { success: false; issues: ValidationIssue[] };

const normalizeText = (value: FormDataEntryValue | null) =>
  typeof value === "string" ? value.trim() : "";

const normalizeOptionalText = (value: FormDataEntryValue | null) => {
  const trimmed = normalizeText(value);
  return trimmed.length > 0 ? trimmed : undefined;
};

const isValidEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

const validateDate = (value?: string) => {
  if (!value) {
    return true;
  }

  return !Number.isNaN(Date.parse(value));
};

const validateLength = (value: string, min: number, max: number) => value.length >= min && value.length <= max;

const pushIssue = (issues: ValidationIssue[], field: string, message: string) => {
  issues.push({ field, message });
};

const resolveTemplate = (occasion: OccasionId, rawTemplate: string) => {
  if (isTemplateId(rawTemplate)) {
    return rawTemplate;
  }

  return getDefaultTemplateForOccasion(occasion);
};

export const validateCreateCardFormData = (formData: FormData): ValidationResult => {
  const issues: ValidationIssue[] = [];

  const recipientName = normalizeText(formData.get("recipientName"));
  const occasion = normalizeText(formData.get("occasion"));
  const occasionText = normalizeText(formData.get("occasionText"));
  const fromLabel = normalizeText(formData.get("fromLabel"));
  const organizerName = normalizeText(formData.get("organizerName"));
  const organizerEmail = normalizeText(formData.get("organizerEmail"));
  const eventDate = normalizeOptionalText(formData.get("eventDate"));
  const description = normalizeOptionalText(formData.get("description"));
  const rawTemplateId = normalizeText(formData.get("templateId"));

  if (!validateLength(recipientName, 2, 80)) {
    pushIssue(issues, "recipientName", "Укажите имя получателя длиной от 2 до 80 символов.");
  }

  if (!isOccasionId(occasion)) {
    pushIssue(issues, "occasion", "Выберите формат будущей открытки.");
  }

  if (!validateLength(occasionText, 2, 40)) {
    pushIssue(issues, "occasionText", "Укажите короткую надпись события: от 2 до 40 символов.");
  }

  if (!validateLength(fromLabel, 2, 80)) {
    pushIssue(issues, "fromLabel", "Укажите, от кого открытка, длиной от 2 до 80 символов.");
  }

  if (!validateLength(organizerName, 2, 80)) {
    pushIssue(issues, "organizerName", "Укажите имя организатора длиной от 2 до 80 символов.");
  }

  if (!isValidEmail(organizerEmail)) {
    pushIssue(issues, "organizerEmail", "Введите корректный email организатора.");
  }

  if (eventDate && !validateDate(eventDate)) {
    pushIssue(issues, "eventDate", "Дата события выглядит некорректно.");
  }

  if (description && !validateLength(description, 10, 300)) {
    pushIssue(issues, "description", "Описание должно быть от 10 до 300 символов.");
  }

  if (issues.length > 0) {
    return { success: false, issues };
  }

  const validOccasion = occasion as OccasionId;

  return {
    success: true,
    data: {
      recipientName,
      occasion: validOccasion,
      occasionText,
      fromLabel,
      organizerName,
      organizerEmail,
      eventDate,
      description,
      templateId: resolveTemplate(validOccasion, rawTemplateId)
    }
  };
};
