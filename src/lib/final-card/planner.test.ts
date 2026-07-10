import { buildFinalCardLayout } from "@/lib/final-card/planner";

describe("buildFinalCardLayout", () => {
  it("keeps required blocks even when optional content is missing", () => {
    const layout = buildFinalCardLayout("bright-celebration", {
      hasSummary: false,
      hasQualities: false,
      hasMemories: false,
      hasQuotes: false,
      hasAiSummary: false
    });

    expect(layout.blocks.map((block) => block.id)).toEqual(["hero", "messages", "quotes", "closing"]);
  });

  it("includes optional blocks when matching content exists", () => {
    const layout = buildFinalCardLayout("gentle-personal", {
      hasSummary: true,
      hasQualities: false,
      hasMemories: true,
      hasQuotes: true,
      hasAiSummary: false
    });

    expect(layout.blocks.map((block) => block.id)).toEqual(["hero", "summary", "messages", "memories", "quotes", "closing"]);
  });

  it("respects organizer block settings for optional sections", () => {
    const layout = buildFinalCardLayout(
      "team-modern",
      {
        hasSummary: true,
        hasQualities: true,
        hasMemories: false,
        hasQuotes: true,
        hasAiSummary: true
      },
      {
        summary: false,
        qualities: true,
        quotes: false
      }
    );

    expect(layout.blocks.map((block) => block.id)).toEqual(["hero", "qualities", "messages", "ai-summary", "closing"]);
  });

  it("respects custom block order from organizer", () => {
    const layout = buildFinalCardLayout(
      "team-modern",
      {
        hasSummary: true,
        hasQualities: true,
        hasMemories: false,
        hasQuotes: true,
        hasAiSummary: true
      },
      {
        summary: true,
        qualities: true,
        quotes: true,
        "ai-summary": true
      },
      ["hero", "messages", "summary", "qualities", "quotes", "ai-summary", "closing"]
    );

    expect(layout.blocks.map((block) => block.id)).toEqual([
      "hero",
      "messages",
      "summary",
      "qualities",
      "quotes",
      "ai-summary",
      "closing"
    ]);
  });
});
