import { describe, expect, it } from "vitest";
import { buildLadderPrompt, buildLadderRetryPrompt, type LadderRawInput } from "@/lib/ai/greeting-ladder";
import {
  fitLadderVariantToLimit,
  validateLadderVariants,
  type LadderVariant
} from "@/lib/ai/greeting-ladder-validation";

const runLive = process.env.RUN_OPENAI_LIVE === "1";
const types = ["safe", "warm", "expressive"] as const;

const scenarios: Record<string, {
  input: LadderRawInput;
  detailPattern: RegExp;
  forbiddenSignature: RegExp;
}> = {
  graduation: {
    input: {
      recipientName: "Анна Ивановна",
      occasionText: "С выпускным!",
      fromLabel: "от сокурсника",
      relationshipContext: "сокурсница",
      draftNotes: "Хочу поздравить с выпускным сокурсницу. Всю учёбу она мне помогала, без неё мои оценки были бы хуже. Она очень профессиональна, пунктуальна, всегда приходит на помощь. Нужно пожелать ей найти работу мечты, высокую зарплату и карьерный рост.",
      messageLimit: 280
    },
    detailPattern: /помощ|оценк|пунктуальн/iu,
    forbiddenSignature: /от\s+сокурсник/iu
  },
  educator: {
    input: {
      recipientName: "Анна Ивановна",
      occasionText: "С днём рождения!",
      fromLabel: "от родителя Ларисы Федоровны",
      relationshipContext: "воспитатель ребёнка",
      draftNotes: "Нужно поздравить Анну Ивановну с днём рождения. Она очень внимательна к детям. Дети её слушают и любят. Она часто придумывает разные утренники и много занимается с детьми. За это мы её ценим. Нужно пожелать здоровья, успехов и радости от того, чем она занимается.",
      messageLimit: 280
    },
    detailPattern: /внимательн|утренник|занима\p{L}*\s+с\s+детьми|дет\p{L}*\s+(?:е[её]|вас)\s+(?:слушают|любят)/iu,
    forbiddenSignature: /Ларис\p{L}*\s+Ф[её]доровн/iu
  },
  wedding: {
    input: {
      recipientName: "Анна и Дмитрий",
      occasionText: "С днём свадьбы!",
      fromLabel: "от друга Алексея",
      relationshipContext: "друзья",
      draftNotes: "Хочу поздравить их со свадьбой. Они долго к этому шли и приняли обдуманное решение. Они очень подходят друг другу. Пусть брак будет долгим, пусть будет взаимопонимание, достаток и детей побольше.",
      messageLimit: 280
    },
    detailPattern: /долго\s+шли|обдуманн\p{L}*\s+решени|подходит\p{L}*\s+друг\s+другу/iu,
    forbiddenSignature: /Алекс[её]й|от\s+друга/iu
  }
};

const schemaFor = (requestedTypes: readonly string[]) => ({
  type: "object",
  additionalProperties: false,
  properties: {
    variants: {
      type: "array",
      minItems: requestedTypes.length,
      maxItems: requestedTypes.length,
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          type: { type: "string", enum: requestedTypes },
          label: { type: "string" },
          text: { type: "string" }
        },
        required: ["type", "label", "text"]
      }
    }
  },
  required: ["variants"]
} as const);

const requestLevels = async (args: {
  apiKey: string;
  baseUrl: string;
  model: string;
  system: string;
  user: string;
  requestedTypes: readonly string[];
}) => {
  const startedAt = performance.now();
  const response = await fetch(`${args.baseUrl}/chat/completions`, {
    method: "POST",
    headers: { Authorization: `Bearer ${args.apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: args.model,
      messages: [{ role: "system", content: args.system }, { role: "user", content: args.user }],
      response_format: {
        type: "json_schema",
        json_schema: { name: "greeting_assistance_levels", strict: true, schema: schemaFor(args.requestedTypes) }
      },
      reasoning_effort: "low",
      max_completion_tokens: 1800
    }),
    signal: AbortSignal.timeout(Number(process.env.OPENAI_TIMEOUT_MS ?? 45_000))
  });
  const latencyMs = Math.round(performance.now() - startedAt);
  if (!response.ok) throw new Error(`OpenAI returned HTTP ${response.status}`);
  const payload = await response.json() as {
    model?: string;
    usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number };
    choices?: Array<{ message?: { content?: string } }>;
  };
  const raw = payload.choices?.[0]?.message?.content ?? "";
  return {
    model: payload.model ?? args.model,
    usage: payload.usage,
    latencyMs,
    raw,
    variants: (JSON.parse(raw) as { variants: LadderVariant[] }).variants
  };
};

describe.runIf(runLive)("OpenAI assistance levels live", () => {
  it("generates safe, warm and expressive variants with one request", async () => {
    const apiKey = process.env.OPENAI_API_KEY?.trim();
    const baseUrl = (process.env.OPENAI_BASE_URL ?? "https://api.openai.com/v1").replace(/\/$/, "");
    const model = process.env.OPENAI_MODEL ?? "gpt-5-mini";
    if (!apiKey) throw new Error("OPENAI_API_KEY is missing");

    const scenarioName = process.env.GREETING_LIVE_SCENARIO ?? "wedding";
    const scenario = scenarios[scenarioName];
    if (!scenario) throw new Error(`Unknown GREETING_LIVE_SCENARIO: ${scenarioName}`);
    const prompt = buildLadderPrompt(scenario.input);
    const initial = await requestLevels({ apiKey, baseUrl, model, system: prompt.system, user: prompt.user, requestedTypes: types });
    const initialValidation = validateLadderVariants(initial.variants, scenario.input, prompt.context, prompt.limits);
    let finalVariants = initial.variants;
    let retry: Awaited<ReturnType<typeof requestLevels>> | null = null;

    if (initialValidation.rejectedTypes.length > 0) {
      const retryPrompt = buildLadderRetryPrompt(
        scenario.input,
        initialValidation.rejectedTypes.map((type) => ({
          type,
          reasons: initialValidation.issues.filter((issue) => issue.type === type).map((issue) => issue.message)
        })),
        initialValidation.accepted
      );
      retry = await requestLevels({
        apiKey,
        baseUrl,
        model,
        system: retryPrompt.system,
        user: retryPrompt.user,
        requestedTypes: retryPrompt.requestedTypes
      });
      const replacements = new Map(retry.variants.map((variant) => [variant.type, variant]));
      finalVariants = initial.variants.map((variant) => replacements.get(variant.type) ?? variant);
    }

    finalVariants = finalVariants.map((variant) => fitLadderVariantToLimit(
      variant,
      prompt.limits[variant.type as keyof typeof prompt.limits]
    ));
    const finalValidation = validateLadderVariants(finalVariants, scenario.input, prompt.context, prompt.limits);
    const texts = finalVariants.map((variant) => variant.text);
    const checks = {
      validJson: true,
      threeVariants: finalVariants.length === 3,
      underLimit: texts.every((text) => Array.from(text).length <= 280),
      levelLimits: finalVariants.every((variant) => {
        const limit = prompt.limits[variant.type as keyof typeof prompt.limits];
        return Array.from(variant.text).length <= limit;
      }),
      correctAddress: texts.every((text) => text.toLocaleLowerCase("ru-RU").includes(prompt.context.address.toLocaleLowerCase("ru-RU"))),
      addressMode: prompt.context.addressMode === "tu"
        ? texts.every((text) => !/(?<!\p{L})(?:вы|вас|вам|ваш\p{L}*)(?!\p{L})/iu.test(text))
        : texts.every((text) => !/(?<!\p{L})(?:ты|тебя|тебе|твой\p{L}*)(?!\p{L})/iu.test(text)),
      authorNumber: prompt.context.authorNumber !== "singular" || texts.every((text) => !/(?<!\p{L})(?:мы|нам|нас|наш\p{L}*|поздравляем|желаем|ценим)(?!\p{L})/iu.test(text)),
      noFromLabel: texts.every((text) => !scenario.forbiddenSignature.test(text)),
      noAuthorGender: texts.every((text) => !/(?<!\p{L})я\s+(?:[\p{L}-]+\s+){0,3}(?:благодарн|был|была|справил|заимствовал|обязан|обязана)(?!\p{L})/iu.test(text)),
      noHrPhrases: texts.every((text) => !/карьерн\p{L}*\s+(?:рост|лестниц)|профессиональн\p{L}*\s+развити|стабильн\p{L}*\s+доход|достойн\p{L}*\s+позици|приятн\p{L}*\s+деньг/iu.test(text)),
      hasPersonalDetail: texts.filter((text) => scenario.detailPattern.test(text)).length >= 2,
      naturalLanguage: texts.every((text) => !/принес\p{L}*[^.!?]{0,50}\s+и\s+чтобы|наслаждени\p{L}*\s+от\s+тем/iu.test(text))
    };

    console.log("OPENAI_ASSISTANCE_LEVELS_RESULT=" + JSON.stringify({
      model: initial.model,
      scenario: scenarioName,
      inferredContext: prompt.context,
      usage: {
        initial: initial.usage,
        retry: retry?.usage,
        totalTokens: (initial.usage?.total_tokens ?? 0) + (retry?.usage?.total_tokens ?? 0)
      },
      latencyMs: initial.latencyMs + (retry?.latencyMs ?? 0),
      initial: { variants: initial.variants, issues: initialValidation.issues },
      retry: retry ? { variants: retry.variants } : null,
      variants: finalVariants,
      finalIssues: finalValidation.issues,
      checks
    }));
    expect(finalValidation.issues).toHaveLength(0);
    expect(checks).toEqual(Object.fromEntries(Object.keys(checks).map((key) => [key, true])));
  }, 45_000);
});
