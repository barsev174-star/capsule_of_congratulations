import { describe, expect, it } from "vitest";
import { generateMatrixWithOpenAi } from "@/lib/ai/openai-provider";

const runLive = process.env.RUN_OPENAI_LIVE === "1";

describe.runIf(runLive)("OpenAI greeting matrix live", () => {
  it("generates all seven variants with one provider request", async () => {
    const result = await generateMatrixWithOpenAi({
      recipientName: "Анна Ивановна",
      occasionText: "С выпускным!",
      relationshipContext: "сокурсница",
      draftNotes: "Хочу поздравить с выпускным сокурсницу. Всю учёбу она мне помогала, без неё мои оценки были бы хуже. Она очень профессиональна, пунктуальна, всегда приходит на помощь. Нужно пожелать ей найти работу мечты, высокую зарплату и карьерный рост.",
      style: "humor",
      messageLimit: 280,
      fromLabel: "от друзей",
      existingMessages: [],
      attempt: 0
    });

    console.log("OPENAI_MATRIX_LIVE_RESULT=" + JSON.stringify(result));
    expect(result.variants).toHaveLength(7);
  }, 45_000);
});
