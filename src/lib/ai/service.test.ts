import { generateParticipantMessage } from "@/lib/ai/service";

describe("generateParticipantMessage", () => {
  it("returns three message variants", async () => {
    const result = await generateParticipantMessage({
      cardId: `card_test_${Date.now()}`,
      recipientName: "Анна",
      occasion: "teacher",
      relation: "родитель",
      qualities: ["добрая", "внимательная"],
      wishes: ["здоровья", "радости"],
      personalDetail: "Спасибо за поддержку детей.",
      style: "warm-simple"
    });

    expect(result.variants).toHaveLength(3);
    expect(result.variants[0].text).toContain("Анна");
  });
});
