import { describe, expect, it } from "vitest";
import {
  getOccasionPlacement,
  rankGreetingSelections,
  scoreGreetingSelection,
  scoreGreetingVariant,
  scoreStructureDiversity
} from "@/lib/ai/greeting-scoring";
import type { AiVariant } from "@/lib/ai/types";

const input = {
  draftNotes: "Спасибо за помощь во время учёбы. Хочу пожелать хорошей работы и высокой зарплаты.",
  style: "warm-simple" as const
};

const varied: AiVariant[] = [
  { id: "short", label: "Короткий", text: "Анна, с выпускным! Спасибо за помощь — это многое для меня значило." },
  { id: "warm", label: "Душевный", text: "Всю учёбу на тебя можно было положиться, и я очень ценю твою поддержку." },
  { id: "style", label: "Ваш стиль", text: "Пусть впереди найдётся место, где тебе будет интересно." }
];

const repetitive: AiVariant[] = [
  { id: "short", label: "Короткий", text: "Спасибо за помощь. Желаю достойного дохода." },
  { id: "warm", label: "Душевный", text: "Спасибо за помощь. Пусть будет стабильный доход." },
  { id: "style", label: "Ваш стиль", text: "Спасибо за помощь. Желаю хорошей оплаты и карьерного роста." }
];

describe("greeting selection scoring", () => {
  it("prefers a varied trio over repeated career wishes", () => {
    expect(scoreGreetingSelection(varied, input)).toBeGreaterThan(scoreGreetingSelection(repetitive, input));
    expect(rankGreetingSelections([repetitive, varied], input)[0]).toBe(varied);
  });

  it("penalizes repeated money themes across the selected trio", () => {
    expect(scoreGreetingSelection(repetitive, input)).toBeLessThan(220);
  });

  it("reports invented humor details as a strong soft issue", () => {
    const result = scoreGreetingVariant(
      { id: "style", label: "Ваш стиль", text: "Теперь можно спокойно забыть про будильник." },
      { ...input, style: "humor" }
    );

    expect(result.softIssues).toContain("INVENTED_DETAIL");
    expect(result.score).toBeLessThan(60);
  });

  it("penalizes resume humor for warm-simple", () => {
    const result = scoreGreetingVariant(
      { id: "style", label: "Ваш стиль", text: "Теперь можно записать командный игрок в резюме." },
      { ...input, style: "warm-simple" }
    );

    expect(result.softIssues).toContain("WARM_SIMPLE_STYLE_MISMATCH");
  });

  it("penalizes work and pay as a humor topic", () => {
    const result = scoreGreetingVariant(
      { id: "style", label: "Ваш стиль", text: "Пусть будущая работа платит вовремя — вот и вся шутка." },
      { ...input, style: "humor" }
    );

    expect(result.softIssues).toContain("HUMOR_WORK_THEME");
  });

  it("penalizes stiff gratitude for a peer in respectful style", () => {
    const result = scoreGreetingVariant(
      { id: "style", label: "Ваш стиль", text: "Анна, выражаю благодарность за твою помощь." },
      { ...input, style: "respectful", relationshipContext: "сокурсница" }
    );

    expect(result.softIssues).toContain("STIFF_GRATITUDE");
  });

  it("detects different occasion placements", () => {
    expect(getOccasionPlacement("Анна, с выпускным! Спасибо за помощь.", "С выпускным!")).toBe("start");
    expect(getOccasionPlacement("Спасибо за помощь — с выпускным, Анна!", "С выпускным!")).toBe("middle");
    expect(getOccasionPlacement("Анна, спасибо за помощь и поддержку.", "С выпускным!")).toBe("absent");
  });

  it("penalizes the same name-thanks-occasion-wish structure", () => {
    const repetitiveStructure: AiVariant[] = [
      { id: "short", label: "Короткий", text: "Анна, спасибо за помощь — с выпускным! Пусть всё сложится хорошо." },
      { id: "warm", label: "Душевный", text: "Анна, спасибо за поддержку — с выпускным! Пусть новый этап будет спокойным." },
      { id: "style", label: "Ваш стиль", text: "Анна, спасибо за надёжность — с выпускным! Пусть впереди будет интереснее." }
    ];
    const diverseStructure: AiVariant[] = [
      { id: "short", label: "Короткий", text: "Анна, спасибо за помощь и надёжность." },
      { id: "warm", label: "Душевный", text: "С выпускным, Анна! Твоя поддержка многое для меня значила." },
      { id: "style", label: "Ваш стиль", text: "Без твоей помощи учиться было бы сложнее — пусть новый этап будет спокойным." }
    ];
    const context = { recipientName: "Анна Ивановна", occasionText: "С выпускным!" };

    expect(scoreStructureDiversity(repetitiveStructure, context).score)
      .toBeLessThan(scoreStructureDiversity(diverseStructure, context).score);
    expect(scoreStructureDiversity(repetitiveStructure, context).issues)
      .toContain("OCCASION_REPEATED_IN_ALL");
  });

  it("prefers a concrete draft detail over a generic safe phrase", () => {
    const concrete = scoreGreetingVariant(
      { id: "warm", label: "Душевный", text: "Анна, спасибо за помощь всю учёбу — без тебя мои оценки были бы скромнее." },
      input
    );
    const generic = scoreGreetingVariant(
      { id: "warm", label: "Душевный", text: "Анна, пусть рядом будут люди, которые ценят твой труд." },
      input
    );

    expect(concrete.specificityScore).toBeGreaterThan(generic.specificityScore);
    expect(concrete.score).toBeGreaterThan(generic.score);
  });

  it("prioritizes a safe trio containing a personal consequence", () => {
    const personalInput = {
      draftNotes: "Всю учёбу она помогала мне, без неё мои оценки были бы хуже. Она пунктуальна.",
      style: "humor" as const,
      recipientName: "Анна Ивановна",
      occasionText: "С выпускным!",
      relationshipContext: "сокурсница"
    };
    const genericSelection: AiVariant[] = [
      { id: "short", label: "Короткий", text: "Анна, спасибо за помощь и пунктуальность." },
      { id: "warm", label: "Душевный", text: "С выпускным! Спасибо, что всегда помогала." },
      { id: "style", label: "Ваш стиль", text: "Пусть следующий этап будет спокойным." }
    ];
    const personalSelection: AiVariant[] = [
      { id: "short", label: "Короткий", text: "Анна, спасибо за помощь всю учёбу." },
      { id: "warm", label: "Душевный", text: "Без тебя мои оценки были бы скромнее — это многое для меня значило." },
      { id: "style", label: "Ваш стиль", text: "С выпускным! Спасибо за пунктуальность и поддержку." }
    ];

    expect(rankGreetingSelections([genericSelection, personalSelection], personalInput)[0])
      .toBe(personalSelection);
  });

  it.each([
    "Пусть рядом будут люди, которые ценят твой труд и место, где тебе интересно.",
    "Пусть на новом этапе люди дают спокойствие для роста.",
    "Анна, спасибо за профессиональность.",
    "Анна, спасибо за помощь; с выпускным и удачи."
  ])("penalizes awkward language: %s", (text) => {
    const result = scoreGreetingVariant({ id: "style", label: "Ваш стиль", text }, input);
    expect(result.softIssues).toContain("AWKWARD_LANGUAGE");
  });

  it("penalizes formal gratitude between peers", () => {
    const result = scoreGreetingVariant(
      { id: "style", label: "Ваш стиль", text: "Анна, искренняя благодарность за твою помощь." },
      { ...input, style: "respectful", relationshipContext: "сокурсница" }
    );

    expect(result.softIssues).toContain("TOO_OFFICIAL_FOR_PEER");
  });

  it("rewards a personal consequence in the humor style", () => {
    const personalInput = {
      draftNotes: "Без неё мои оценки были бы хуже, она всегда помогала.",
      style: "humor" as const,
      relationshipContext: "сокурсница"
    };
    const result = scoreGreetingVariant(
      { id: "style", label: "Ваш стиль", text: "Без тебя мои оценки точно были бы скромнее — теперь это можно признать." },
      personalInput
    );

    expect(result.tags).toContain("humor-personal-consequence");
  });
});
