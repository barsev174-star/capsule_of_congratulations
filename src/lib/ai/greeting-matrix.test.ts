import { describe, expect, it } from "vitest";
import { buildMatrixSelections, inferRelationshipContext, selectMatrixVariants } from "@/lib/ai/greeting-matrix";
import type { AiMatrixVariant } from "@/lib/ai/types";

const matrix: AiMatrixVariant[] = [
  { id: "short", label: "Короткий", text: "Анна, спасибо за помощь! Пусть впереди всё сложится хорошо." },
  { id: "warm", label: "Душевный", text: "Спасибо, что всегда приходила на помощь. Это многое для меня значило." },
  { id: "warm-simple", label: "Тепло и просто", text: "Спасибо за поддержку. С тобой учиться было намного легче." },
  { id: "short-no-pathos", label: "Коротко без пафоса", text: "Спасибо за помощь. Удачи после выпуска!" },
  { id: "humor", label: "С лёгким юмором", text: "Без тебя мои оценки были бы скромнее — похоже, диплом немного и твоя заслуга." },
  { id: "touching", label: "Трогательно", text: "Твоя поддержка сделала годы учёбы легче. Спасибо, что была рядом." },
  { id: "respectful", label: "Уважительно", text: "Анна, спасибо за ответственность и готовность всегда помочь." }
];

describe("greeting matrix", () => {
  it("lets explicit peer context override an official-looking name", () => {
    expect(inferRelationshipContext({
      relationshipContext: "сокурсница",
      draftNotes: "Хочу поблагодарить Анну Ивановну за помощь."
    })).toEqual({
      relationshipType: "peer",
      addressMode: "tu",
      mainFocus: "личная благодарность"
    });
  });

  it.each([
    ["директор", "official", "vy"],
    ["мама", "family", "tu"],
    ["любимая", "romantic", "tu"],
    ["знакомая", "unknown", "neutral"]
  ] as const)("infers %s as %s/%s", (context, relationshipType, addressMode) => {
    expect(inferRelationshipContext({ relationshipContext: context, draftNotes: "Тёплые слова к празднику." }))
      .toMatchObject({ relationshipType, addressMode });
  });

  it("maps seven internal variants to the unchanged public contract", () => {
    expect(selectMatrixVariants(matrix, "humor")).toEqual([
      { id: "short", label: "Короткий", text: matrix[0].text },
      { id: "warm", label: "Душевный", text: matrix[1].text },
      { id: "style", label: "Ваш стиль", text: matrix[4].text }
    ]);
  });

  it("offers fallback selections from the same matrix", () => {
    const selections = buildMatrixSelections(matrix, "warm-simple");

    expect(selections.some((selection) => selection[0].text === matrix[3].text)).toBe(true);
    expect(selections.some((selection) => selection[1].text === matrix[5].text)).toBe(true);
    expect(selections.every((selection) => selection[2].text === matrix[2].text)).toBe(true);
  });

  it("fails when matrix output is incomplete", () => {
    expect(() => selectMatrixVariants(matrix.filter((variant) => variant.id !== "touching"), "touching"))
      .toThrowError(expect.objectContaining({ code: "INVALID_PROVIDER_RESPONSE" }));
  });
});
