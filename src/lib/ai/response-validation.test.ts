import { inspectProviderVariants, textSimilarity, validateProviderVariants } from "@/lib/ai/response-validation";

const variants = [
  { type: "short", label: "Короткий", text: "Анна, желаю больше радостных и спокойных дней." },
  { type: "warm", label: "Душевный", text: "Анна, спасибо за поддержку и умение всегда поднять настроение." },
  { type: "style", label: "Ваш стиль", text: "Пусть рядом будут любимые люди, а времени на отдых станет больше." }
];

describe("AI provider response validation", () => {
  it("accepts three distinct variants", () => {
    const result = validateProviderVariants({
      value: { variants },
      maxLength: 280,
      draftNotes: "Она всегда поддерживает и умеет поднять настроение. Хочу пожелать ей больше отдыха.",
      existingMessages: []
    });

    expect(result).toHaveLength(3);
  });

  it("rejects a variant that repeats an existing greeting", () => {
    const result = validateProviderVariants({
      value: { variants },
      maxLength: 280,
      draftNotes: "Она всегда поддерживает и умеет поднять настроение. Хочу пожелать ей больше отдыха.",
      existingMessages: [variants[0].text]
    });

    expect(result).toBeNull();
  });

  it("keeps valid variants when only one variant fails", () => {
    const result = inspectProviderVariants({
      value: { variants },
      maxLength: 280,
      draftNotes: "Она всегда поддерживает и умеет поднять настроение. Хочу пожелать ей больше отдыха.",
      existingMessages: [variants[0].text]
    });

    expect(result.variants.map((variant) => variant.id)).toEqual(["warm", "style"]);
    expect(result.issues).toEqual(expect.arrayContaining([
      expect.objectContaining({ type: "short", code: "TOO_SIMILAR", severity: "soft" })
    ]));
  });

  it("measures normalized Russian text similarity", () => {
    expect(textSimilarity("Счастья и теплых дней!", "Счастья и тёплых дней")).toBe(1);
  });

  it("accepts only genuinely shorter variants in shortening mode", () => {
    const source = "Анна, спасибо за поддержку и умение всегда поднять настроение. Желаю больше спокойных, радостных дней и времени на отдых.";
    const result = validateProviderVariants({
      value: { variants },
      maxLength: 90,
      draftNotes: source,
      existingMessages: [],
      mode: "shorten"
    });

    expect(result).toHaveLength(3);
    expect(result?.every((variant) => variant.text.length < source.length)).toBe(true);
  });

  it("rejects an invented patronymic", () => {
    const result = validateProviderVariants({
      value: {
        variants: variants.map((variant, index) =>
          index === 0 ? { ...variant, text: "Анна Ивановна, желаю вам прекрасного праздника." } : variant
        )
      },
      maxLength: 280,
      draftNotes: "Хочу поздравить Анну и пожелать ей больше радостных дней.",
      existingMessages: [],
      recipientName: "Анна"
    });

    expect(result).toBeNull();
  });

  it("rejects an invented diminutive name", () => {
    const result = inspectProviderVariants({
      value: {
        variants: variants.map((variant, index) =>
          index === 2 ? { ...variant, text: "Анечка, пусть карьера идёт вверх по экспоненте!" } : variant
        )
      },
      maxLength: 280,
      draftNotes: "Хочу поздравить Анну и пожелать ей хорошей работы.",
      existingMessages: [],
      recipientName: "Анна Ивановна"
    });

    expect(result.variants).toHaveLength(2);
    expect(result.issues).toEqual(expect.arrayContaining([
      expect.objectContaining({ type: "style", code: "FORBIDDEN_PHRASE", severity: "soft" })
    ]));
  });

  it("rejects a formal address for an explicitly close relationship", () => {
    const result = validateProviderVariants({
      value: {
        variants: variants.map((variant, index) =>
          index === 0 ? { ...variant, text: "Желаю вам больше радостных и спокойных дней." } : variant
        )
      },
      maxLength: 280,
      draftNotes: "Хочу поздравить сокурсницу и поблагодарить за поддержку.",
      existingMessages: [],
      relationshipContext: "сокурсница"
    });

    expect(result).toBeNull();
  });

  it("rejects an unsupported formal cliché", () => {
    const result = inspectProviderVariants({
      value: {
        variants: variants.map((variant, index) =>
          index === 0 ? { ...variant, text: "Поздравляю с этим знаменательным событием и желаю радости." } : variant
        )
      },
      maxLength: 280,
      draftNotes: "Хочу тепло поздравить и пожелать больше радостных дней.",
      existingMessages: []
    });

    expect(result.variants).toHaveLength(2);
    expect(result.issues).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: "FORBIDDEN_PHRASE", severity: "soft" })
    ]));
  });

  it("rejects career cliché wording even when it came from the draft", () => {
    const result = validateProviderVariants({
      value: {
        variants: variants.map((variant, index) =>
          index === 0 ? { ...variant, text: "Анна, желаю тебе стремительного карьерного роста." } : variant
        )
      },
      maxLength: 280,
      draftNotes: "Хочу пожелать найти работу мечты, высокую зарплату и карьерный рост.",
      existingMessages: []
    });

    expect(result).toBeNull();
  });

  it("keeps a literal wish list as a soft quality warning", () => {
    const result = inspectProviderVariants({
      value: {
        variants: variants.map((variant, index) =>
          index === 0
            ? { ...variant, text: "Желаю найти работу мечты, высокую зарплату и карьерный рост." }
            : variant
        )
      },
      maxLength: 280,
      draftNotes: "Нужно пожелать ей найти работу мечты, высокую зарплату и карьерный рост.",
      existingMessages: []
    });

    expect(result.variants).toHaveLength(3);
    expect(result.issues).toEqual(expect.arrayContaining([
      expect.objectContaining({ type: "short", code: "FORBIDDEN_PHRASE", severity: "soft" })
    ]));
  });

  it("keeps shallow wish-list wording as a soft quality warning", () => {
    const result = inspectProviderVariants({
      value: {
        variants: variants.map((variant, index) =>
          index === 0
            ? { ...variant, text: "Пусть работа будет любимой, оплата высокой, а карьера стремительной." }
            : variant
        )
      },
      maxLength: 280,
      draftNotes: "Нужно пожелать ей найти работу мечты, высокую зарплату и карьерный рост.",
      existingMessages: []
    });

    expect(result.variants).toHaveLength(3);
    expect(result.issues).toEqual(expect.arrayContaining([
      expect.objectContaining({ type: "short", code: "FORBIDDEN_PHRASE" })
    ]));
  });

  it("accepts naturally rephrased career wishes", () => {
    const result = validateProviderVariants({
      value: {
        variants: [
          {
            type: "short",
            text: "Анна, спасибо за помощь всю учёбу. Пусть впереди будет работа по душе и зарплата, которая радует."
          },
          {
            type: "warm",
            text: "Без тебя учиться было бы сложнее. Желаю найти место, где тебя ценят и где тебе самой интересно."
          },
          {
            type: "style",
            text: "Пусть после выпуска будет хороший старт и люди, которые быстро заметят, как на тебя можно положиться."
          }
        ]
      },
      maxLength: 280,
      draftNotes: "Хочу пожелать найти работу мечты, высокую зарплату и карьерный рост.",
      existingMessages: []
    });

    expect(result).toHaveLength(3);
  });

  it("rejects prompt leakage from draft instructions", () => {
    const result = validateProviderVariants({
      value: {
        variants: variants.map((variant, index) =>
          index === 0 ? { ...variant, text: "Анна, нужно пожелать ей хорошую работу и высокий доход." } : variant
        )
      },
      maxLength: 280,
      draftNotes: "Нужно пожелать ей найти хорошую работу.",
      existingMessages: []
    });

    expect(result).toBeNull();
  });

  it("rejects negative humor wording", () => {
    const result = validateProviderVariants({
      value: {
        variants: variants.map((variant, index) =>
          index === 2 ? { ...variant, text: "Теперь твои знания станут чьей-то головной болью." } : variant
        )
      },
      maxLength: 280,
      draftNotes: "Хочу поздравить сокурсницу с выпускным.",
      existingMessages: [],
      style: "humor"
    });

    expect(result).toBeNull();
  });

  it("allows a natural use of the relationship word", () => {
    const result = validateProviderVariants({
      value: {
        variants: variants.map((variant, index) =>
          index === 0 ? { ...variant, text: "Анна, ты замечательная сокурсница. Спасибо за помощь всю учёбу!" } : variant
        )
      },
      maxLength: 280,
      draftNotes: "Хочу поздравить сокурсницу и поблагодарить за помощь.",
      existingMessages: []
    });

    expect(result).toHaveLength(3);
  });

  it("rejects three variants with the same opening", () => {
    const result = validateProviderVariants({
      value: {
        variants: variants.map((variant, index) => ({
          ...variant,
          text: `Анна, желаю тебе ${["радости и отдыха", "тепла и вдохновения", "хороших людей рядом"][index]}.`
        }))
      },
      maxLength: 280,
      draftNotes: "Хочу пожелать Анне радости, тепла и больше времени на отдых.",
      existingMessages: []
    });

    expect(result).toBeNull();
  });

  it("rejects an emoji that was not present in the draft", () => {
    const result = validateProviderVariants({
      value: {
        variants: variants.map((variant, index) =>
          index === 2 ? { ...variant, text: `🎉 ${variant.text}` } : variant
        )
      },
      maxLength: 280,
      draftNotes: "Хочу тепло поздравить и пожелать больше времени на отдых.",
      existingMessages: []
    });

    expect(result).toBeNull();
  });
});
