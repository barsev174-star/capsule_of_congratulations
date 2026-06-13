import type { CreateContributionInput } from "@/lib/cards/types";

export type ContributionValidationIssue = {
  field: string;
  message: string;
};

export type ContributionValidationResult =
  | { success: true; data: CreateContributionInput }
  | { success: false; issues: ContributionValidationIssue[] };

const normalizeText = (value: FormDataEntryValue | null) =>
  typeof value === "string" ? value.trim() : "";

const pushIssue = (issues: ContributionValidationIssue[], field: string, message: string) => {
  issues.push({ field, message });
};

const hasSpamLikeContent = (message: string) => /(https?:\/\/|www\.|t\.me\/|bit\.ly)/i.test(message);
const wordCount = (message: string) => message.split(/\s+/).filter(Boolean).length;
const isTooGeneric = (message: string) => {
  const normalized = message.toLowerCase().replace(/[!.,?]+/g, "").trim();
  return ["поздравляю", "с праздником", "всего хорошего", "удачи"].includes(normalized);
};

export const validateContributionFormData = (formData: FormData): ContributionValidationResult => {
  const issues: ContributionValidationIssue[] = [];

  const cardId = normalizeText(formData.get("cardId"));
  const authorName = normalizeText(formData.get("authorName"));
  const authorRole = normalizeText(formData.get("authorRole"));
  const message = normalizeText(formData.get("message"));

  if (!cardId) {
    pushIssue(issues, "cardId", "Не удалось определить открытку для этого поздравления.");
  }

  if (authorName.length < 2 || authorName.length > 80) {
    pushIssue(issues, "authorName", "Имя автора должно быть от 2 до 80 символов.");
  }

  if (authorRole && authorRole.length > 80) {
    pushIssue(issues, "authorRole", "Подпись или роль должна быть не длиннее 80 символов.");
  }

  if (message.length < 20 || message.length > 1500) {
    pushIssue(issues, "message", "Текст поздравления должен быть от 20 до 1500 символов.");
  }

  if (wordCount(message) < 3) {
    pushIssue(issues, "message", "Добавьте чуть больше смысла: хотя бы 3 слова.");
  }

  if (hasSpamLikeContent(message)) {
    pushIssue(issues, "message", "Ссылки в тексте пока не поддерживаются.");
  }

  if (isTooGeneric(message)) {
    pushIssue(issues, "message", "Такой текст слишком короткий и общий. Добавьте хотя бы пару теплых деталей.");
  }

  if (issues.length > 0) {
    return { success: false, issues };
  }

  return {
    success: true,
    data: {
      cardId,
      authorName,
      authorRole,
      message
    }
  };
};
