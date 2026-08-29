import { afterEach, describe, expect, it, vi } from "vitest";
import { getConfiguredEmailProvider, sendTransactionalEmail } from "@/lib/email/transport";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("transactional email transport", () => {
  it("prefers Yandex Cloud Postbox and signs the REST request", async () => {
    vi.stubEnv("EMAIL_PROVIDER", "postbox");
    vi.stubEnv("EMAIL_FROM", "Slovesto <hello@slovesto.ru>");
    vi.stubEnv("YANDEX_POSTBOX_ACCESS_KEY_ID", "access-key-id");
    vi.stubEnv("YANDEX_POSTBOX_SECRET_ACCESS_KEY", "secret-key");
    const fetchMock = vi.fn().mockResolvedValue(new Response("{}", { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    await sendTransactionalEmail({
      to: "user@example.com",
      replyTo: "support@slovesto.ru",
      subject: "Проверка",
      html: "<p>Письмо</p>",
      text: "Письмо"
    });

    expect(getConfiguredEmailProvider()).toBe("postbox");
    const [url, init] = fetchMock.mock.calls[0] as [URL, RequestInit];
    expect(String(url)).toBe("https://postbox.cloud.yandex.net/v2/email/outbound-emails");
    expect(init.headers).toMatchObject({
      "Content-Type": "application/json",
      "X-Amz-Content-Sha256": expect.stringMatching(/^[a-f0-9]{64}$/),
      "X-Amz-Date": expect.stringMatching(/^\d{8}T\d{6}Z$/),
      Authorization: expect.stringMatching(/^AWS4-HMAC-SHA256 Credential=access-key-id\/\d{8}\/ru-central1\/ses\/aws4_request/)
    });
    expect(JSON.parse(String(init.body))).toMatchObject({
      FromEmailAddress: "Slovesto <hello@slovesto.ru>",
      Destination: { ToAddresses: ["user@example.com"] },
      ReplyToAddresses: ["support@slovesto.ru"],
      Content: { Simple: { Subject: { Data: "Проверка", Charset: "UTF-8" } } }
    });
  });

  it("keeps Resend as an explicit migration fallback", async () => {
    vi.stubEnv("EMAIL_PROVIDER", "resend");
    vi.stubEnv("EMAIL_FROM", "Slovesto <hello@example.com>");
    vi.stubEnv("RESEND_API_KEY", "resend-secret");
    const fetchMock = vi.fn().mockResolvedValue(new Response("{}", { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    await sendTransactionalEmail({
      to: "user@example.com",
      subject: "Тема",
      html: "<p>Текст</p>",
      text: "Текст",
      idempotencyKey: "mail-1"
    });

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://api.resend.com/emails");
    expect(init.headers).toMatchObject({ Authorization: "Bearer resend-secret", "Idempotency-Key": "mail-1" });
  });

  it("does not include upstream response bodies in errors", async () => {
    vi.stubEnv("EMAIL_PROVIDER", "postbox");
    vi.stubEnv("EMAIL_FROM", "Slovesto <hello@slovesto.ru>");
    vi.stubEnv("YANDEX_POSTBOX_ACCESS_KEY_ID", "access-key-id");
    vi.stubEnv("YANDEX_POSTBOX_SECRET_ACCESS_KEY", "must-not-leak");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("private provider response", { status: 403 })));

    await expect(sendTransactionalEmail({
      to: "user@example.com",
      subject: "Тема",
      html: "<p>Текст</p>",
      text: "Текст"
    })).rejects.toThrow("HTTP 403");

    try {
      await sendTransactionalEmail({ to: "user@example.com", subject: "Тема", html: "x", text: "x" });
    } catch (error) {
      expect(String(error)).not.toContain("private provider response");
      expect(String(error)).not.toContain("must-not-leak");
    }
  });
});
