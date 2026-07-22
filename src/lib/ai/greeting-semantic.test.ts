import { describe, expect, it } from "vitest";
import { buildSemanticPrompt, validateSemanticVariants } from "@/lib/ai/greeting-semantic";

const input = {
  recipientName: "Ирина Олеговна", occasionText: "С днём педагога!", fromLabel: "Татьяна родитель",
  draftNotes: "Она чуткая, но требовательная. Дети её обожают. Желаю здоровья, терпения и не терять настроя.", messageLimit: 280
};

describe("semantic greeting", () => {
  it("keeps all user context in one compact prompt", () => {
    const prompt = buildSemanticPrompt(input);
    expect(prompt.user).toContain("Ирина Олеговна");
    expect(prompt.user).toContain("С днём педагога!");
    expect(prompt.user).toContain("Татьяна родитель");
    expect(prompt.limits).toEqual({ safe: 280, warm: 280, expressive: 280 });
    expect(prompt.system).toContain("Повод: в каждом варианте");
    expect(prompt.system).toContain("Имя с отчеством не меняет явное «ты».");
    expect(prompt.system).toContain("редакторская задача");
    expect(prompt.system).toContain("variantApproach");
    expect(prompt.system).toContain("Иерархия источников");
  });

  it("treats pronoun heuristics as warnings, not hard errors", () => {
    const result = validateSemanticVariants({
      safe: { text: "Ирина Олеговна, мы поздравляем вас с праздником!" },
      warm: { text: "Ирина Олеговна, спасибо, что ты так заботишься о детях." },
      expressive: { text: "Ирина Олеговна, с днём педагога!" }
    }, { safe: 280, warm: 280, expressive: 280 });
    expect(result.hardErrors).toEqual([]);
    expect(result.softWarnings.map((item) => item.code)).toEqual(expect.arrayContaining(["AUTHOR_VOICE_AMBIGUOUS", "ADDRESS_FORM_AMBIGUOUS"]));
  });

  it("repairs only objective errors", () => {
    const result = validateSemanticVariants({
      safe: { text: "Ирина Олеговна, с праздником!" },
      warm: { text: "Ирина Олеговна, с праздником!" },
      expressive: { text: "Ирина Олеговна, " + "очень ".repeat(60) }
    }, { safe: 280, warm: 280, expressive: 280 });
    expect(result.hardErrors.map((item) => item.code)).toEqual(expect.arrayContaining(["DUPLICATE", "TOO_LONG"]));
  });
});
