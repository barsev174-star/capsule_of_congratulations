import { generateParticipantMessage } from "@/lib/ai/service";

describe("AI draft naturalness", () => {
  it("cleans aggressive punctuation from user fragments", async () => {
    const result = await generateParticipantMessage({
      cardId: `card_test_punct_${Date.now()}`,
      recipientName: "Анидовна",
      occasion: "personal",
      occasionText: "собираем открытку для любимого воспитателя группы",
      draftNotes:
        "!Хочу пожелать любви, радости! Ценю доброту и заботу! Рядом с вами спокойно и тепло!",
      style: "humor"
    });

    const text = result.variants.map((item) => item.text).join(" ");
    expect(text).not.toContain("!");
    expect(text).toContain("любви");
  });

  it("does not insert negative personal detail into the final text", async () => {
    const result = await generateParticipantMessage({
      cardId: `card_test_detail_${Date.now()}`,
      recipientName: "Анидовна",
      occasion: "personal",
      occasionText: "собираем открытку в благодарность за заботу о детях",
      draftNotes: "Хочу пожелать спокойствия. Умеет очень громко кричать. Ценю доброту и заботу.",
      style: "humor"
    });

    const text = result.variants.map((item) => item.text).join(" ").toLowerCase();
    expect(text).not.toContain("крич");
  });

  it("produces different drafts for repeated generations on the same card", async () => {
    const cardId = `card_test_repeat_${Date.now()}`;
    const first = await generateParticipantMessage({
      cardId,
      recipientName: "Анна",
      occasion: "team",
      occasionText: "собираем открытку от команды продукта",
      draftNotes:
        "Хочу пожелать радости и здоровья. Очень ценю твою надежность и то, как приятно с тобой работать.",
      style: "warm-simple"
    });

    const second = await generateParticipantMessage({
      cardId,
      recipientName: "Анна",
      occasion: "team",
      occasionText: "собираем открытку от команды продукта",
      draftNotes:
        "Хочу пожелать радости и здоровья. Очень ценю твою надежность и то, как приятно с тобой работать.",
      style: "warm-simple"
    });

    const firstJoined = first.variants.map((item) => item.text).join(" ");
    const secondJoined = second.variants.map((item) => item.text).join(" ");

    expect(firstJoined).not.toBe(secondJoined);
  });
});
