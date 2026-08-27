import { afterEach, describe, expect, it, vi } from "vitest";
import { buildComposerPrompt, buildComposerRepairPrompt, buildComposerReviewPrompt, buildExtractorPrompt, buildSingleComposerPrompt, getOccasionExpressionMode, getSafeFactCoverageSignal, getSemanticPlanCacheKey, stabilizeComposerVariants, stabilizeGreetingSemanticPlan, validateComposerVariants, validateSingleComposerText } from "@/lib/ai/greeting-two-stage";

const input = { recipientName: "Ирина Олеговна", occasionText: "С Днём педагога!", fromLabel: "Татьяна, родитель", draftNotes: "Она чуткая. Нужен лёгкий юмор в конце.", messageLimit: 280 };
const plan = { authorVoice: "I", authorGender: "UNKNOWN", addressForm: "VY", recipientNumber: "ONE", coreFacts: ["чуткая"], contextFacts: [], appreciation: [], wishes: [], derivedQualities: [], editorialIntent: { humor: "LIGHT", humorPlacement: "ENDING", warmthRequested: false, expressivenessRequested: false, otherNotes: ["Нужен лёгкий юмор в конце"] }, phrasesWorthPreserving: [], ambiguities: [] } as const;

describe("two-stage greeting generation", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("sends the raw draft only to the extractor", () => {
    expect(buildExtractorPrompt(input).user).toContain("Нужен лёгкий юмор");
    const composer = buildComposerPrompt(input, plan);
    expect(composer.user).not.toContain("Нужен лёгкий юмор");
    expect(composer.user).not.toContain("otherNotes");
    expect(composer.user).toContain("С Днём педагога!");
    expect(composer.user).toContain("Повод: С Днём педагога!");
    expect(composer.user).toContain("\"authorGender\":\"UNKNOWN\"");
  });

  it("uses a stable cache key for an unchanged normalized draft", () => {
    expect(getSemanticPlanCacheKey({ ...input, draftNotes: "Она чуткая.\nНужен лёгкий юмор в конце." })).toBe(getSemanticPlanCacheKey({ ...input, draftNotes: "Она чуткая.\r\nНужен лёгкий юмор в конце." }));
    expect(getSemanticPlanCacheKey(input)).not.toBe(getSemanticPlanCacheKey({ ...input, draftNotes: "Она чуткая. Без юмора." }));
  });

  it("stabilizes explicit author voice and address grammar without guessing from a signature", () => {
    expect(stabilizeGreetingSemanticPlan({ ...input, draftNotes: "Желаем здоровья и хороших дней." }, { ...plan, authorVoice: "NEUTRAL" }).authorVoice).toBe("WE");
    expect(stabilizeGreetingSemanticPlan({ ...input, draftNotes: "Поздравляем! Мне очень помогли. Желаю здоровья." }, { ...plan, authorVoice: "WE" }).authorVoice).toBe("AMBIGUOUS");
    expect(stabilizeGreetingSemanticPlan({ ...input, draftNotes: "Спасибо, что ты помогла." }, { ...plan, addressForm: "VY" }).addressForm).toBe("TY");
    expect(stabilizeGreetingSemanticPlan({ ...input, recipientName: "Мама", draftNotes: "Спасибо, что всегда поддерживаешь." }, { ...plan, authorGender: "FEMALE" }).authorGender).toBe("UNKNOWN");
    expect(stabilizeGreetingSemanticPlan({ ...input, draftNotes: "Я благодарна за вашу помощь." }, { ...plan, authorGender: "UNKNOWN" }).authorGender).toBe("FEMALE");
  });

  it("keeps the existing prompt unchanged under the default profile", () => {
    vi.stubEnv("AI_GREETING_PROMPT_PROFILE", "default");
    const extractor = buildExtractorPrompt(input);
    const composer = buildComposerPrompt(input, plan);

    expect(extractor.system).not.toContain("Выполни классификацию буквально");
    expect(composer.system).not.toContain("машинные ограничения");
    expect(composer.user).toContain("Лимит каждого варианта: 280");
    expect(composer.user).toContain('"endingTone":"PLAYFUL_ENDING"');
  });

  it("uses stricter extraction, intent and length rules under the Yandex profile", () => {
    vi.stubEnv("AI_GREETING_PROMPT_PROFILE", "yandex");
    const defaultKey = (() => {
      vi.stubEnv("AI_GREETING_PROMPT_PROFILE", "default");
      return getSemanticPlanCacheKey(input);
    })();
    vi.stubEnv("AI_GREETING_PROMPT_PROFILE", "yandex");
    const extractor = buildExtractorPrompt(input);
    const composer = buildComposerPrompt(input, plan);

    expect(extractor.system).toContain("одновременно есть явные признаки I и WE");
    expect(extractor.system).toContain("Выделяй coreFacts атомарно");
    expect(composer.system).toContain("WE = «поздравляем/желаем/благодарим»");
    expect(composer.system).toContain("подошла бы почти любому человеку");
    expect(composer.system).toContain("Каждый coreFact с mustPreserve=true");
    expect(composer.system).toContain("Не копируй композицию SAFE");
    expect(composer.system).not.toContain("настоящее сокровище");
    expect(composer.user).toContain("Целевая длина: не более 229 символов");
    expect(composer.user).toContain('"coreFacts":[{"id":"f1","text":"чуткая","mustPreserve":true}]');
    expect(composer.user).toContain('"occasionMode":"EXPLICIT_FORMULA"');
    expect(composer.user).not.toContain("derivedQualities");
    expect(composer.user).toContain('"humor":"LIGHT"');
    expect(composer.user).not.toContain("endingTone");
    expect(composer.planRequirements).toBeUndefined();
    expect(getSemanticPlanCacheKey(input)).not.toBe(defaultKey);
  });

  it("gives Yandex wishes deterministic IDs without changing the extractor plan", () => {
    vi.stubEnv("AI_GREETING_PROMPT_PROFILE", "yandex");
    vi.stubEnv("YANDEX_COMPOSER_PLANNING", "1");
    const composer = buildComposerPrompt(input, { ...plan, wishes: ["здоровья", "удачи"] });

    expect(composer.user).toContain('"wishes":[{"id":"w1","text":"здоровья"},{"id":"w2","text":"удачи"}]');
    expect(composer.planRequirements?.validIds).toEqual(["o1", "f1", "w1", "w2"]);
    expect(composer.planRequirements?.requiredIds).toEqual(["o1", "f1", "w1", "w2"]);
    expect(plan.wishes).toEqual([]);
  });

  it("enables the planned v6 contract only behind its experiment flag", () => {
    vi.stubEnv("AI_GREETING_PROMPT_PROFILE", "yandex");
    vi.stubEnv("YANDEX_COMPOSER_PLANNING", "1");
    const composer = buildComposerPrompt(input, plan);

    expect(composer.planning).toBe(true);
    expect(composer.system).toContain("Plan описывает весь содержательный материал текста");
    expect(composer.system).toContain("Сначала полностью сформируй plans.safe");
    expect(composer.user).toContain('"occasion":{"id":"o1","text":"С Днём педагога!","mode":"EXPLICIT_FORMULA"}');
    expect(composer.planRequirements).toEqual({ validIds: ["o1", "f1"], requiredIds: ["o1", "f1"], factIds: ["f1"], humorRequested: true });
  });

  it("keeps a contextual occasion out of planned content IDs", () => {
    vi.stubEnv("AI_GREETING_PROMPT_PROFILE", "yandex");
    vi.stubEnv("YANDEX_COMPOSER_PLANNING", "1");
    const composer = buildComposerPrompt({ ...input, occasionText: "уход из компании" }, plan);

    expect(composer.user).toContain('"occasion":{"id":"o1","text":"уход из компании","mode":"CONTEXTUAL"}');
    expect(composer.planRequirements?.validIds).toEqual(["f1"]);
    expect(composer.planRequirements?.requiredIds).toEqual(["f1"]);
  });

  it("builds a universal review pass from the semantic plan and generated variants", () => {
    vi.stubEnv("AI_GREETING_PROMPT_PROFILE", "yandex");
    const base = buildComposerPrompt(input, plan);
    const review = buildComposerReviewPrompt(base, {
      safe: { text: "Первый текст" },
      warm: { text: "Второй текст" },
      expressive: { text: "Третий текст" }
    });

    expect(review.system).toContain("молча найди опору в смысловом плане");
    expect(review.system).toContain("Убирай как класс");
    expect(review.user).toContain('"safe":{"text":"Первый текст"}');
    expect(review.user).toContain('"coreFacts":[{"id":"f1","text":"чуткая","mustPreserve":true}]');
  });

  it("builds one close main text and an explicitly bounded creative transformation", () => {
    vi.stubEnv("AI_GREETING_PROMPT_PROFILE", "yandex");
    const initial = buildSingleComposerPrompt(input, plan, "initial");
    const creative = buildSingleComposerPrompt(input, plan, "creative", "С днём педагога! Спасибо за чуткость.");

    expect(initial.system).toContain("максимально близко к смыслу и порядку исходных мыслей");
    expect(initial.user).not.toContain("Текущий готовый текст");
    expect(creative.system).toContain("не более одной новой образной или игровой детали");
    expect(creative.system).toContain("не должна звучать как новое реальное событие");
    expect(creative.user).toContain("Текущий готовый текст");
  });

  it("validates a single result with the same semantic safeguards", () => {
    vi.stubEnv("AI_GREETING_PROMPT_PROFILE", "yandex");
    const result = validateSingleComposerText(
      "С днём педагога! Желаю здоровья.",
      280,
      { ...plan, coreFacts: [{ id: "f1", text: "чуткая", mustPreserve: true }] },
      input.occasionText
    );

    expect(result.hardErrors).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: "MISSING_REQUIRED_FACT" })
    ]));
  });

  it("isolates a text-only repair from the planning response contract", () => {
    vi.stubEnv("AI_GREETING_PROMPT_PROFILE", "yandex");
    vi.stubEnv("YANDEX_COMPOSER_PLANNING", "1");
    const repair = buildComposerRepairPrompt(buildComposerPrompt(input, plan), "warm", "Неудачный текст", "TOO_LONG");

    expect(repair.system).toContain("не создавай и не возвращай композиционные plans");
    expect(repair.system).toContain("Верни только объект с полем text");
    expect(repair.user).toContain("Исправь только вариант warm");
  });

  it("keeps hard validation objective", () => {
    const result = validateComposerVariants({ safe: { text: "С Днём педагога!" }, warm: { text: "С Днём педагога!" }, expressive: { text: "Текст".repeat(100) } }, { safe: 280, warm: 280, expressive: 280 });
    expect(result.hardErrors.map((item) => item.code)).toEqual(expect.arrayContaining(["DUPLICATE", "TOO_LONG"]));
  });

  it("detects explicit voice or address mismatches", () => {
    const strictPlan = { ...plan, authorVoice: "WE", addressForm: "VY" } as const;
    const result = validateComposerVariants({
      safe: { text: "С праздником! Благодарим вас и желаем здоровья!" },
      warm: { text: "С праздником! Поздравляю вас и желаю удачи!" },
      expressive: { text: "С праздником! Благодарим тебя за помощь и желаем здоровья!" }
    }, { safe: 280, warm: 280, expressive: 280 }, strictPlan);

    expect(result.hardErrors).toEqual(expect.arrayContaining([
      expect.objectContaining({ type: "warm", code: "AUTHOR_VOICE_MISMATCH" }),
      expect.objectContaining({ type: "expressive", code: "ADDRESS_FORM_MISMATCH" })
    ]));
  });

  it("detects a missing occasion and an unknown author gender leak", () => {
    const result = validateComposerVariants({
      safe: { text: "Алексей, спасибо за совместную работу. Очень благодарен за помощь." },
      warm: { text: "Алексей, в связи с уходом из компании благодарю за совместную работу." },
      expressive: { text: "В связи с уходом из компании спасибо за пять лет совместной работы." }
    }, { safe: 280, warm: 280, expressive: 280 }, plan, "В связи с уходом из компании");

    expect(result.hardErrors).toEqual(expect.arrayContaining([
      expect.objectContaining({ type: "safe", code: "AUTHOR_GENDER_MISMATCH" }),
      expect.objectContaining({ type: "safe", code: "OCCASION_MISSING" })
    ]));
  });

  it("allows a neutral event to be expressed contextually under the Yandex profile", () => {
    vi.stubEnv("AI_GREETING_PROMPT_PROFILE", "yandex");
    expect(getOccasionExpressionMode("уход из компании")).toBe("CONTEXTUAL");
    expect(getOccasionExpressionMode("день рождения")).toBe("EXPLICIT_FORMULA");

    const result = validateComposerVariants({
      safe: { text: "Алексей, спасибо за пять лет совместной работы." },
      warm: { text: "Алексей, за пять лет вместе особенно запомнилась ваша помощь." },
      expressive: { text: "Алексей, пять лет совместной работы многое значат. Спасибо за помощь." }
    }, { safe: 280, warm: 280, expressive: 280 }, { ...plan, coreFacts: [] }, "уход из компании");

    expect(result.hardErrors.map((item) => item.code)).not.toContain("OCCASION_MISSING");
  });

  it("reports a missing required atomic fact under the Yandex profile", () => {
    vi.stubEnv("AI_GREETING_PROMPT_PROFILE", "yandex");
    const atomicPlan = {
      ...plan,
      coreFacts: [
        { id: "f1", text: "пять лет совместной работы", mustPreserve: true },
        { id: "f2", text: "спокойная помощь новичкам", mustPreserve: true },
        { id: "f3", text: "готовность подхватить сложную задачу", mustPreserve: true }
      ]
    } as const;
    const result = validateComposerVariants({
      safe: { text: "Алексей, спасибо за пять лет совместной работы и готовность подхватить сложную задачу." },
      warm: { text: "Алексей, спасибо за пять лет работы, спокойную помощь новичкам и готовность подхватить сложную задачу." },
      expressive: { text: "Алексей, за пять лет вместе вы помогали новичкам и подхватывали сложные задачи." }
    }, { safe: 280, warm: 280, expressive: 280 }, atomicPlan, "уход из компании");

    expect(result.hardErrors).toEqual(expect.arrayContaining([
      expect.objectContaining({ type: "safe", code: "MISSING_REQUIRED_FACT", detail: expect.stringContaining("f2") })
    ]));
    expect(result.hardErrors.filter((item) => item.type === "warm")).toEqual([]);
  });

  it("reports all omitted author wishes in one repair issue", () => {
    vi.stubEnv("AI_GREETING_PROMPT_PROFILE", "yandex");
    const wishPlan = { ...plan, coreFacts: [], wishes: ["здоровья", "удачи", "чтобы лишних винтов всегда оставалось ровно ноль"] } as const;
    const result = validateComposerVariants({
      safe: { text: "Дима, с днём рождения! Желаю здоровья, удачи и чтобы лишних винтов оставалось ровно ноль." },
      warm: { text: "С днём рождения, Дима! Желаю здоровья и удачи, а лишних винтов — ровно ноль." },
      expressive: { text: "Дима, с днём рождения! Пусть после сборки не останется лишних винтов." }
    }, { safe: 280, warm: 280, expressive: 280 }, wishPlan, "день рождения");

    const missingWishIssues = result.hardErrors.filter((item) => item.code === "MISSING_WISH");
    expect(missingWishIssues).toHaveLength(1);
    expect(missingWishIssues[0]).toEqual(expect.objectContaining({
      type: "expressive",
      detail: expect.stringMatching(/здоровья.*удачи/u)
    }));
  });

  it("reports highly similar variants as a diagnostic warning", () => {
    const result = validateComposerVariants({
      safe: { text: "Мама, с днём рождения! Спасибо за поддержку и добрые слова. Желаю здоровья, сил и больше времени для себя." },
      warm: { text: "Мама, с днём рождения! Спасибо за добрые слова и поддержку. Желаю здоровья, сил и больше времени для себя." },
      expressive: { text: "С днём рождения, мама! Рядом с тобой становится спокойнее. Желаю здоровья, сил и времени для себя." }
    }, { safe: 280, warm: 280, expressive: 280 });

    expect(result.softWarnings).toEqual(expect.arrayContaining([
      expect.objectContaining({ type: "warm", code: "VARIANTS_TOO_SIMILAR" })
    ]));
  });

  it("validates composition plan IDs diagnostically", () => {
    vi.stubEnv("AI_GREETING_PROMPT_PROFILE", "yandex");
    vi.stubEnv("YANDEX_COMPOSER_PLANNING", "1");
    const composer = buildComposerPrompt(input, plan);
    const variants = {
      safe: { text: "С днём педагога! Спасибо за чуткость." },
      warm: { text: "Спасибо за чуткость. С днём педагога!" },
      expressive: { text: "С днём педагога! Ваша чуткость помогает." }
    };
    const result = validateComposerVariants(variants, composer.limits, plan, input.occasionText, {
      safe: ["o1", "f1"],
      warm: ["f1", "f1", "o1"],
      expressive: ["f1", "unknown"],
      expressiveHumorFactId: "unknown"
    }, composer.planRequirements);

    expect(result.hardErrors).toEqual([]);
    expect(result.softWarnings).toEqual(expect.arrayContaining([
      expect.objectContaining({ type: "warm", code: "COMPOSITION_PLAN_DUPLICATE_ID" }),
      expect.objectContaining({ type: "expressive", code: "COMPOSITION_PLAN_UNKNOWN_ID" }),
      expect.objectContaining({ type: "expressive", code: "COMPOSITION_PLAN_REQUIRED_ID_MISSING", detail: "o1" }),
      expect.objectContaining({ type: "expressive", code: "COMPOSITION_HUMOR_ID_INVALID" })
    ]));
  });

  it("accepts impersonal neutral wording and rejects first-person verbs", () => {
    const neutralPlan = { ...plan, authorVoice: "NEUTRAL" } as const;
    const result = validateComposerVariants({
      safe: { text: "С праздником! Спасибо за помощь. Здоровья и сил!" },
      warm: { text: "С праздником! Желаем здоровья и сил!" },
      expressive: { text: "С праздником! Пусть впереди будут хорошие перемены!" }
    }, { safe: 280, warm: 280, expressive: 280 }, neutralPlan, "С праздником!");

    expect(result.hardErrors).toEqual([
      expect.objectContaining({ type: "warm", code: "AUTHOR_VOICE_MISMATCH" })
    ]);
  });

  it("neutralizes common first-person constructions deterministically", () => {
    const neutralPlan = { ...plan, authorVoice: "NEUTRAL" } as const;
    const result = stabilizeComposerVariants({
      safe: { text: "С праздником! Благодарим за помощь. Желаем здоровья и сил!" },
      warm: { text: "С праздником! Ценим вашу внимательность." },
      expressive: { text: "С праздником! Пусть будут хорошие перемены!" }
    }, neutralPlan);

    expect(result.safe.text).toBe("С праздником! Спасибо за помощь. Здоровья и сил!");
    expect(result.warm.text).toBe("С праздником! Спасибо за вашу внимательность.");
    expect(result.expressive.text).toBe("С праздником! Пусть будут хорошие перемены!");
  });

  it("reports fact coverage without rejecting a greeting", () => {
    expect(getSafeFactCoverageSignal(plan, "С Днём педагога! Вы чуткая.")).toEqual({ total: 1, matched: 1, ratio: 1 });
    expect(getSafeFactCoverageSignal(plan, "С Днём педагога!")).toEqual({ total: 1, matched: 0, ratio: 0 });
  });
});
