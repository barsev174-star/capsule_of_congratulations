import { generateParticipantMessage } from "@/lib/ai/service";

describe("generateParticipantMessage", () => {
  it("returns three message variants", async () => {
    const result = await generateParticipantMessage({
      cardId: `card_test_${Date.now()}`,
      recipientName: "Анна",
      occasion: "personal",
      occasionText: "благодарим за выпускной год в садике",
      draftNotes:
        "Хочу пожелать любви и радости. Ценю скромность, целеустремленность и то, как приятно с тобой работать.",
      style: "warm-simple"
    });

    expect(result.variants).toHaveLength(3);
    expect(result.variants[0].text).toContain("Анна");
  });
});
