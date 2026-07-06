import { createLogEntry, logger, sanitizeLogContext } from "@/lib/logger";

describe("logger", () => {
  it("creates a structured log entry", () => {
    const entry = createLogEntry("info", "app.started", "Application started", {
      area: "bootstrap"
    });

    expect(entry.level).toBe("info");
    expect(entry.event).toBe("app.started");
    expect(entry.message).toBe("Application started");
    expect(entry.context).toEqual({ area: "bootstrap" });
    expect(entry.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it("sends info logs to console.info", () => {
    const spy = vi.spyOn(console, "info").mockImplementation(() => undefined);

    logger.info("funnel.card_created", "Card draft created", { source: "landing" });

    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy.mock.calls[0][0]).toContain("\"event\":\"funnel.card_created\"");
    spy.mockRestore();
  });

  it("sends error logs to console.error", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => undefined);

    logger.error("payment.failed", "Payment callback failed", { cardId: "card_1" });

    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy.mock.calls[0][0]).toContain("\"level\":\"error\"");
    spy.mockRestore();
  });

  it("removes personal text and credentials from context", () => {
    expect(sanitizeLogContext({
      cardId: "card_1",
      organizerEmail: "person@example.com",
      manageToken: "secret",
      message: "personal greeting",
      nested: { accessUrl: "https://example.test/private", status: 502 }
    })).toEqual({ cardId: "card_1", nested: { status: 502 } });
  });
});
