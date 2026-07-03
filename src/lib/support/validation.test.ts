import { describe, expect, it } from "vitest";
import { validateSupportRequest } from "./validation";

const validForm = () => {
  const formData = new FormData();
  formData.set("category", "problem");
  formData.set("email", "User@Example.com");
  formData.set("message", "После нажатия на кнопку ничего не происходит.");
  formData.set("source", "manage");
  return formData;
};

describe("validateSupportRequest", () => {
  it("normalizes a valid request", () => {
    expect(validateSupportRequest(validForm())).toEqual({
      ok: true,
      data: {
        category: "problem",
        contactName: null,
        email: "user@example.com",
        message: "После нажатия на кнопку ничего не происходит.",
        source: "manage"
      }
    });
  });

  it("rejects an invalid email", () => {
    const formData = validForm();
    formData.set("email", "not-an-email");
    expect(validateSupportRequest(formData)).toEqual({
      ok: false,
      message: "Введите корректный email для ответа."
    });
  });

  it("rejects a message that is too short", () => {
    const formData = validForm();
    formData.set("message", "Ошибка");
    expect(validateSupportRequest(formData)).toEqual({
      ok: false,
      message: "Опишите вопрос чуть подробнее — хотя бы в 10 символах."
    });
  });

  it("does not accept an arbitrary source", () => {
    const formData = validForm();
    formData.set("source", "https://example.com/manage/secret-token");
    const result = validateSupportRequest(formData);
    expect(result.ok && result.data.source).toBe("other");
  });
});
