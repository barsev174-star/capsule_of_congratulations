import { describe, expect, it } from "vitest";
import { buildLadderContext, buildLadderRetryPrompt, type LadderRawInput } from "@/lib/ai/greeting-ladder";
import { ensureLadderVariantAddress, fitLadderVariantToLimit, validateLadderVariants, type LadderVariant } from "@/lib/ai/greeting-ladder-validation";

const input: LadderRawInput = {
  recipientName: "Анна Ивановна",
  occasionText: "С выпускным!",
  fromLabel: "от сокурсника",
  relationshipContext: "сокурсница",
  draftNotes: "Всю учёбу она помогала мне, без неё мои оценки были бы хуже. Она пунктуальна.",
  messageLimit: 280
};
const limits = { safe: 200, warm: 230, expressive: 260 };
const good: LadderVariant[] = [
  { type: "safe", label: "Аккуратно", text: "Анна, спасибо за помощь всю учёбу. С выпускным!" },
  { type: "warm", label: "Теплее", text: "Анна, с выпускным! Без твоей помощи учиться было бы сложнее." },
  { type: "expressive", label: "Живее", text: "Анна, спасибо за пунктуальность и поддержку — это многое значило." }
];

describe("ladder validation", () => {
  it("accepts three safe variants", () => {
    expect(validateLadderVariants(good, input, buildLadderContext(input), limits).issues).toHaveLength(0);
  });

  it("rejects only variants with wrong voice, gender or awkward language", () => {
    const result = validateLadderVariants([
      good[0],
      { ...good[1], text: "Анна, мы поздравляем тебя и желаем всего хорошего." },
      { ...good[2], text: "Анна, я многое тебе обязана за помощь." }
    ], input, buildLadderContext(input), limits);

    expect(result.accepted.map((variant) => variant.type)).toEqual(["safe"]);
    expect(result.rejectedTypes).toEqual(expect.arrayContaining(["warm", "expressive"]));
  });

  it("builds a retry prompt only for rejected levels", () => {
    const retry = buildLadderRetryPrompt(
      input,
      [{ type: "warm", reasons: ["не используй мы"] }],
      [good[0], good[2]]
    );
    expect(retry.requestedTypes).toEqual(["warm"]);
    expect(retry.user).toContain("Исправь только варианты: warm");
    expect(retry.user).toContain(good[0].text);
  });

  it("removes a short secondary sentence for a small overflow", () => {
    const variant: LadderVariant = {
      type: "safe",
      label: "Аккуратно",
      text: "Анна, поздравляю с выпускным! Спасибо, что помогала всю учёбу — без тебя было бы сложнее. Ты профессиональна и пунктуальна. Пусть впереди найдётся место, где тебе будет интересно."
    };
    const fitted = fitLadderVariantToLimit(variant, 150);

    expect(Array.from(fitted.text).length).toBeLessThanOrEqual(150);
    expect(fitted.text).toContain("Анна, поздравляю с выпускным!");
    expect(fitted.text).toContain("Спасибо, что помогала всю учёбу");
    expect(fitted.text).toContain("Пусть впереди найдётся место");
    expect(fitted.text).not.toContain("профессиональна и пунктуальна");
  });

  it("does not touch large overflows or three-sentence texts", () => {
    const threeSentences = { ...good[0], text: `${good[0].text} ${"Очень ".repeat(20)}важно.` };
    expect(fitLadderVariantToLimit(threeSentences, 80)).toEqual(threeSentences);
    expect(fitLadderVariantToLimit(good[0], 20)).toEqual(good[0]);
  });

  it("fits the graduation safe variant rejected by the live check", () => {
    const liveVariant: LadderVariant = {
      type: "safe",
      label: "Аккуратно",
      text: "Анна, поздравляю с выпуском! Спасибо, что всю учёбу помогала — без тебя мои оценки были бы хуже. Ты профессиональна, пунктуальна и всегда готова помочь. Желаю найти место, где будет интересно и ценят твой труд."
    };
    const fitted = fitLadderVariantToLimit(liveVariant, 200);

    expect(Array.from(fitted.text).length).toBeLessThanOrEqual(200);
    expect(fitted.text).toContain("без тебя мои оценки были бы хуже");
    expect(fitted.text).toContain("Желаю найти место");
    expect(fitted.text).not.toContain("профессиональна, пунктуальна");
  });

  it("adds a missing expected address without regenerating the text", () => {
    const variant = ensureLadderVariantAddress(
      { type: "safe", label: "Аккуратно", text: "Спасибо за вашу заботу о детях." },
      "Ирина Олеговна"
    );

    expect(variant.text).toBe("Ирина Олеговна, спасибо за вашу заботу о детях.");
    expect(ensureLadderVariantAddress(variant, "Ирина Олеговна")).toEqual(variant);
  });

  it("rejects leaked variant labels", () => {
    const result = validateLadderVariants([
      { ...good[0], text: "Аккуратно — Анна, с выпускным!" },
      good[1],
      good[2]
    ], input, buildLadderContext(input), limits);

    expect(result.issues.map((issue) => issue.code)).toContain("VARIANT_LABEL_LEAK");
  });

  it("does not mistake the recipient role in a signature for a leaked signature", () => {
    const neighborInput = {
      recipientName: "Сосед",
      occasionText: "С днём соседа!",
      fromLabel: "Алексей — сосед из 15",
      relationshipContext: "сосед",
      draftNotes: "Спасибо за помощь с машиной в мороз.",
      messageLimit: 280
    } satisfies LadderRawInput;
    const context = buildLadderContext(neighborInput);
    const result = validateLadderVariants([
      { type: "safe", label: "Аккуратно", text: "Сосед, спасибо за помощь с машиной в мороз." },
      { type: "warm", label: "Теплее", text: "Сосед, спасибо, что всегда готовы прийти на помощь." },
      { type: "expressive", label: "Живее", text: "Сосед, пусть машина заводится с первого раза." }
    ], neighborInput, context, { safe: 200, warm: 230, expressive: 260 });

    expect(result.issues.map((issue) => issue.code)).not.toContain("FROM_LABEL_LEAK");
  });

  it("allows an explicit female author to use a matching first-person form", () => {
    const parentInput = {
      recipientName: "Ирина Олеговна",
      occasionText: "С днём педагога!",
      fromLabel: "Татьяна родитель",
      relationshipContext: "родитель воспитанника",
      draftNotes: "Спасибо за заботу о детях.",
      messageLimit: 280
    } satisfies LadderRawInput;
    const variants: LadderVariant[] = [
      { type: "safe", label: "Аккуратно", text: "Ирина Олеговна, с днём педагога! Спасибо за заботу о детях." },
      { type: "warm", label: "Теплее", text: "Ирина Олеговна, я благодарна вам за заботу о детях. С днём педагога!" },
      { type: "expressive", label: "Живее", text: "Ирина Олеговна, с днём педагога! Пусть у вас будет больше сил и радости." }
    ];

    const result = validateLadderVariants(variants, parentInput, buildLadderContext(parentInput), limits);

    expect(result.issues.map((issue) => issue.code)).not.toContain("UNKNOWN_AUTHOR_GENDER");
    expect(result.issues.map((issue) => issue.code)).not.toContain("FROM_LABEL_LEAK");
  });
});
