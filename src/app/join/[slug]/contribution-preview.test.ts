import { describe, expect, it } from "vitest";
import { buildContributionPreview } from "./contribution-preview";

describe("buildContributionPreview", () => {
  it("показывает только первые три слова длинного поздравления", () => {
    expect(buildContributionPreview("Алиса, поздравляем тебя с Днём знаний! Начинается новый учебный год."))
      .toBe("Алиса, поздравляем тебя…");
  });

  it("нормализует пробелы, не раскрывая продолжение", () => {
    expect(buildContributionPreview("  Желаю\nмного   радости и ярких впечатлений "))
      .toBe("Желаю много радости…");
  });

  it("ограничивает очень длинное начало по символам", () => {
    const preview = buildContributionPreview("Сверхдлинноесловобезпробеловкотороенепомещается продолжает поздравление");

    expect(Array.from(preview).length).toBeLessThanOrEqual(33);
    expect(preview.endsWith("…")).toBe(true);
    expect(preview).not.toContain("продолжает");
  });

  it("оставляет короткое поздравление без искусственного многоточия", () => {
    expect(buildContributionPreview("Счастья и любви"))
      .toBe("Счастья и любви");
  });
});
