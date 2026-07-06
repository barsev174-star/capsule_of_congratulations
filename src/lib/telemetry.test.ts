import { parseClientTelemetry, reportCriticalError } from "@/lib/telemetry";

describe("telemetry", () => {
  it("accepts allowlisted events and fields only", () => {
    expect(parseClientTelemetry({
      event: "funnel.gift_opened",
      context: { cardId: "card_1", route: "gift", message: "private", arbitrary: "no" }
    })).toEqual({ event: "funnel.gift_opened", context: { cardId: "card_1", route: "gift" } });
  });

  it("rejects unknown events", () => {
    expect(parseClientTelemetry({ event: "payment.started", context: {} })).toBeNull();
  });

  it("gives critical errors a searchable id without logging their message", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const errorId = await reportCriticalError("database", new Error("private database detail"), { cardId: "card_1" });
    const payload = spy.mock.calls[0][0] as string;

    expect(errorId).toMatch(/^[0-9a-f-]{36}$/);
    expect(payload).toContain(errorId);
    expect(payload).not.toContain("private database detail");
    spy.mockRestore();
  });
});
