import { describe, expect, it } from "vitest";
import { buildLadderPrompt, type LadderRawInput } from "@/lib/ai/greeting-ladder";

const graduation: LadderRawInput = {
  recipientName: "Анна Ивановна",
  occasionText: "С выпускным!",
  fromLabel: "от сокурсника",
  relationshipContext: "сокурсница",
  draftNotes: "Всю учёбу она мне помогала, без неё мои оценки были бы хуже. Она пунктуальна.",
  messageLimit: 280
};

describe("universal ladder prompt", () => {
  it("infers an informal singular graduation context from raw fields", () => {
    const prompt = buildLadderPrompt(graduation);
    expect(prompt.context).toMatchObject({
      address: "Анна",
      recipientNumber: "singular",
      authorNumber: "singular",
      relationshipType: "peer",
      addressMode: "tu",
      occasionCategory: "graduation"
    });
    expect(prompt.user).not.toContain("от сокурсника");
  });

  it("removes a conflicting patronymic from an informal draft", () => {
    const prompt = buildLadderPrompt({
      ...graduation,
      draftNotes: "Хочу поздравить сокурсницу Анну Ивановну. Анна Ивановна помогала мне всю учёбу."
    });

    expect(prompt.context.address).toBe("Анна");
    expect(prompt.context.sanitizedDraft).not.toContain("Анна Ивановна");
    expect(prompt.context.sanitizedDraft).toContain("Анна");
    expect(prompt.context.draftFacts.join(" ")).not.toContain("Анна Ивановна");
  });

  it("keeps a formal full-name address for an educator", () => {
    const prompt = buildLadderPrompt({
      ...graduation,
      occasionText: "С днём рождения!",
      fromLabel: "от родителя Ларисы Федоровны",
      relationshipContext: "воспитатель ребёнка",
      draftNotes: "Она внимательна к детям и придумывает утренники."
    });
    expect(prompt.context).toMatchObject({
      address: "Анна Ивановна",
      authorNumber: "singular",
      relationshipType: "official",
      addressMode: "vy",
      occasionCategory: "birthday"
    });
    expect(prompt.user).not.toContain("Ларисы Федоровны");
  });

  it("infers plural recipients separately from a singular author", () => {
    const prompt = buildLadderPrompt({
      ...graduation,
      recipientName: "Анна и Дмитрий",
      occasionText: "С днём свадьбы!",
      fromLabel: "от друга Алексея",
      relationshipContext: "друзья",
      draftNotes: "Они долго к этому шли и очень подходят друг другу."
    });
    expect(prompt.context).toMatchObject({
      address: "Анна и Дмитрий",
      recipientNumber: "plural",
      authorNumber: "singular",
      addressMode: "vy",
      occasionCategory: "wedding"
    });
    expect(prompt.user).not.toContain("Алексея");
  });

  it("passes existing greetings only as anti-duplication context", () => {
    const prompt = buildLadderPrompt({
      recipientName: "Анна",
      occasionText: "С днём рождения!",
      draftNotes: "Спасибо за поддержку.",
      messageLimit: 280,
      existingMessages: ["Анна, желаю радости и прекрасных дней!"]
    });

    expect(prompt.user).toContain("Анна, желаю радости и прекрасных дней!");
    expect(prompt.user).toContain("нельзя копировать или близко повторять");
  });

  it("keeps a concrete neighbor story while treating a humor request as a direction", () => {
    const prompt = buildLadderPrompt({
      recipientName: "Сосед",
      occasionText: "С Днём соседа!",
      relationshipContext: "сосед",
      draftNotes: "Он опора подъезда, часто помогает и никогда не отказывает. Мне помог завести машину в мороз, за это спасибо. Нужен какой-то юмор добавить в конце.",
      messageLimit: 280
    });

    expect(prompt.context.humorRequested).toBe(true);
    expect(prompt.context.sanitizedDraft).toContain("завести машину в мороз");
    expect(prompt.context.sanitizedDraft).not.toContain("юмор");
    expect(prompt.user).toContain("Лёгкий юмор в конце: нужен только в expressive");
    expect(prompt.user).toContain("Никогда не пиши слова «с юмором»");
    expect(prompt.user).toContain("Сохраняй грамматическую роль каждого факта");
  });
});
