import { parseClientTelemetry, reportCriticalError } from "@/lib/telemetry";

describe("telemetry", () => {
  it("accepts allowlisted events and fields only", () => {
    expect(parseClientTelemetry({
      event: "gift_first_opened",
      context: { cardId: "card_1", route: "gift", message: "private", arbitrary: "no" }
    })).toEqual({ event: "gift_first_opened", context: { cardId: "card_1", route: "gift" } });
  });

  it("rejects unknown events", () => {
    expect(parseClientTelemetry({ event: "payment.started", context: {} })).toBeNull();
  });

  it("accepts reveal editor events without retaining draft data", () => {
    expect(parseClientTelemetry({
      event: "REVEAL_EXAMPLE_OPENED",
      context: {
        templateId: "school-scrapbook",
        revealType: "collect-messages",
        source: "reveal_modal",
        manageToken: "private-token",
        greeting: "private greeting"
      }
    })).toEqual({
      event: "REVEAL_EXAMPLE_OPENED",
      context: {
        templateId: "school-scrapbook",
        revealType: "collect-messages",
        source: "reveal_modal"
      }
    });
  });

  it("accepts the teacher landing events and safe attribution fields", () => {
    expect(parseClientTelemetry({
      event: "seo_create_click",
      context: {
        landing_type: "teacher",
        landing_path: "/gruppovaya-otkrytka/uchitelyu",
        placement: "hero",
        template: "school-classic",
        utm_source: "yandex",
        utm_medium: "organic",
        utm_campaign: "teacher",
        referrer_host: "yandex.ru",
        first_touch_at: "2026-08-21T08:00:00.000Z",
        recipientName: "private"
      }
    })).toEqual({
      event: "seo_create_click",
      context: {
        landing_type: "teacher",
        landing_path: "/gruppovaya-otkrytka/uchitelyu",
        placement: "hero",
        template: "school-classic",
        utm_source: "yandex",
        utm_medium: "organic",
        utm_campaign: "teacher",
        referrer_host: "yandex.ru",
        first_touch_at: "2026-08-21T08:00:00.000Z"
      }
    });
  });

  it("keeps safe upload timing fields for photo diagnostics", () => {
    expect(parseClientTelemetry({
      event: "photo_preparation_completed",
      context: {
        cardId: "card_1",
        durationMs: "184",
        originalBytes: "5314542",
        uploadBytes: "1048576",
        optimized: "true",
        fileName: "private-photo.jpg"
      }
    })).toEqual({
      event: "photo_preparation_completed",
      context: {
        cardId: "card_1",
        durationMs: "184",
        originalBytes: "5314542",
        uploadBytes: "1048576",
        optimized: "true"
      }
    });
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
