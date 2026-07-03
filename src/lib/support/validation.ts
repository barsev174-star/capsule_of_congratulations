import type { CreateSupportRequestInput, SupportRequestCategory } from "./types";

const categories: SupportRequestCategory[] = ["problem", "suggestion", "question"];
const allowedSources = ["landing", "create", "join", "manage", "gift", "other"];
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type SupportRequestValidationResult =
  | { ok: true; data: CreateSupportRequestInput }
  | { ok: false; message: string };

const text = (value: FormDataEntryValue | null) => String(value ?? "").trim();

export const validateSupportRequest = (formData: FormData): SupportRequestValidationResult => {
  const category = text(formData.get("category")) as SupportRequestCategory;
  const contactName = text(formData.get("contactName"));
  const email = text(formData.get("email")).toLowerCase();
  const message = text(formData.get("message"));
  const rawSource = text(formData.get("source"));

  if (!categories.includes(category)) {
    return { ok: false, message: "Выберите тему обращения." };
  }

  if (!emailPattern.test(email) || email.length > 254) {
    return { ok: false, message: "Введите корректный email для ответа." };
  }

  if (contactName.length > 100) {
    return { ok: false, message: "Имя должно быть короче 100 символов." };
  }

  if (message.length < 10) {
    return { ok: false, message: "Опишите вопрос чуть подробнее — хотя бы в 10 символах." };
  }

  if (message.length > 3000) {
    return { ok: false, message: "Сообщение должно быть короче 3000 символов." };
  }

  return {
    ok: true,
    data: {
      category,
      contactName: contactName || null,
      email,
      message,
      source: allowedSources.includes(rawSource) ? rawSource : "other"
    }
  };
};
