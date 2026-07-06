import { POST } from "./route";

describe("telemetry route", () => {
  it("accepts a valid client event", async () => {
    const spy = vi.spyOn(console, "info").mockImplementation(() => undefined);
    const response = await POST(new Request("http://localhost/api/telemetry", {
      method: "POST",
      body: JSON.stringify({ event: "funnel.participant_form_opened", context: { cardId: "card_1", route: "join" } })
    }));
    expect(response.status).toBe(202);
    spy.mockRestore();
  });

  it("rejects unknown events", async () => {
    const response = await POST(new Request("http://localhost/api/telemetry", {
      method: "POST",
      body: JSON.stringify({ event: "unknown.event" })
    }));
    expect(response.status).toBe(400);
  });
});
