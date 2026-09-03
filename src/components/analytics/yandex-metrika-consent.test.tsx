import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const navigation = vi.hoisted(() => ({ pathname: "/" }));
vi.mock("next/navigation", () => ({ usePathname: () => navigation.pathname }));

import {
  ANALYTICS_CONSENT_STORAGE_KEY,
  ANALYTICS_PREFERENCES_EVENT,
  YANDEX_METRIKA_ID,
  YandexMetrikaConsent
} from "./yandex-metrika-consent";
import { readAnalyticsConsent, saveAnalyticsConsent } from "@/lib/client-analytics-consent";
import { ensureCurrentLandingFirstTouch } from "@/lib/client-landing-attribution";

type TestWindow = Window & {
  ym?: ((...args: unknown[]) => void) & { a?: unknown[][] };
  __slovestoMetrikaInitialized?: boolean;
  disableYaCounter111957811?: boolean;
};

const testWindow = () => window as TestWindow;

describe("YandexMetrikaConsent", () => {
  beforeEach(() => {
    navigation.pathname = "/";
    window.history.replaceState({}, "", "/");
    window.localStorage.clear();
    document.querySelectorAll("script[data-yandex-metrika]").forEach((script) => script.remove());
    delete testWindow().ym;
    delete testWindow().__slovestoMetrikaInitialized;
    delete testWindow().disableYaCounter111957811;
    document.cookie = "slv_first_touch=; Max-Age=0; Path=/";
    document.cookie = "_ym_uid=; Max-Age=0; Path=/";
  });

  afterEach(cleanup);

  it("does not load the counter before explicit consent", async () => {
    render(<YandexMetrikaConsent />);
    expect(await screen.findByRole("heading", { name: "Помочь нам улучшать Slovesto?" })).toBeInTheDocument();
    await waitFor(() => expect(testWindow().disableYaCounter111957811).toBe(true));
    expect(document.querySelector("script[data-yandex-metrika]")).toBeNull();
  });

  it("keeps Metrika disabled after refusal", async () => {
    const user = userEvent.setup();
    render(<YandexMetrikaConsent />);
    await user.click(await screen.findByRole("button", { name: "Не использовать" }));
    expect(readAnalyticsConsent()).toBe("declined");
    expect(document.querySelector("script[data-yandex-metrika]")).toBeNull();
    expect(testWindow().disableYaCounter111957811).toBe(true);
  });

  it("loads a privacy-restricted counter and sends a sanitized page hit after consent", async () => {
    const user = userEvent.setup();
    render(<YandexMetrikaConsent />);
    await user.click(await screen.findByRole("button", { name: "Разрешить" }));

    await waitFor(() => expect(document.querySelector("script[data-yandex-metrika]")).not.toBeNull());
    const script = document.querySelector("script[data-yandex-metrika]") as HTMLScriptElement;
    expect(script.src).toBe(`https://mc.yandex.ru/metrika/tag.js?id=${YANDEX_METRIKA_ID}`);
    expect(readAnalyticsConsent()).toBe("accepted");
    expect(JSON.parse(window.localStorage.getItem(ANALYTICS_CONSENT_STORAGE_KEY) ?? "{}")).toMatchObject({
      decision: "accepted",
      consentVersion: "2026-08-26",
      privacyVersion: "2026-08-28"
    });
    expect(testWindow().disableYaCounter111957811).toBe(false);
    expect(testWindow().ym?.a).toEqual(expect.arrayContaining([
      [YANDEX_METRIKA_ID, "init", expect.objectContaining({
        defer: true,
        webvisor: false,
        clickmap: false,
        ecommerce: false,
        trackLinks: false,
        sendTitle: false
      })],
      [YANDEX_METRIKA_ID, "hit", expect.stringMatching(/^http:\/\/localhost(?::\d+)?\/$/), expect.any(Object)]
    ]));
  });

  it("never offers or loads analytics outside the public marketing pages", async () => {
    navigation.pathname = "/join/private-slug";
    saveAnalyticsConsent("accepted");
    render(<YandexMetrikaConsent />);
    await waitFor(() => expect(testWindow().disableYaCounter111957811).toBe(true));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(document.querySelector("script[data-yandex-metrika]")).toBeNull();
  });

  it("reopens preferences and lets a visitor revoke a previous choice", async () => {
    const user = userEvent.setup();
    saveAnalyticsConsent("accepted");
    render(<YandexMetrikaConsent />);
    await waitFor(() => expect(document.querySelector("script[data-yandex-metrika]")).not.toBeNull());
    document.cookie = "slv_first_touch=test; Path=/";
    document.cookie = "_ym_uid=test; Path=/";
    window.localStorage.setItem("_ym_test", "test");
    window.dispatchEvent(new Event(ANALYTICS_PREFERENCES_EVENT));
    await user.click(await screen.findByRole("button", { name: "Не использовать" }));
    expect(readAnalyticsConsent()).toBe("declined");
    expect(testWindow().disableYaCounter111957811).toBe(true);
    expect(document.querySelector("script[data-yandex-metrika]")).toBeNull();
    expect(document.cookie).not.toContain("slv_first_touch=");
    expect(document.cookie).not.toContain("_ym_uid=");
    expect(window.localStorage.getItem("_ym_test")).toBeNull();
  });

  it("does not trust the legacy unversioned consent value", async () => {
    window.localStorage.setItem("slovesto_analytics_consent_v1", "accepted");
    render(<YandexMetrikaConsent />);
    expect(await screen.findByRole("heading", { name: "Помочь нам улучшать Slovesto?" })).toBeInTheDocument();
    expect(document.querySelector("script[data-yandex-metrika]")).toBeNull();
  });

  it("preserves the original campaign during hydration and disables the counter on private routes", async () => {
    window.history.replaceState({}, "", "/?utm_source=telegram&utm_campaign=launch");
    saveAnalyticsConsent("accepted");
    ensureCurrentLandingFirstTouch();
    const firstCookie = document.cookie;
    window.history.replaceState({}, "", "/?utm_source=other");
    const { rerender } = render(<YandexMetrikaConsent />);
    await waitFor(() => expect(testWindow().disableYaCounter111957811).toBe(false));
    expect(document.cookie).toBe(firstCookie);
    expect(testWindow().ym?.a?.filter((args) => args[1] === "hit")).toHaveLength(1);
    navigation.pathname = "/manage/private";
    window.history.replaceState({}, "", navigation.pathname);
    rerender(<YandexMetrikaConsent />);
    expect(testWindow().disableYaCounter111957811).toBe(true);
    expect(testWindow().ym?.a?.filter((args) => args[1] === "hit")).toHaveLength(1);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    navigation.pathname = "/";
    window.history.replaceState({}, "", "/");
    rerender(<YandexMetrikaConsent />);
    expect(testWindow().disableYaCounter111957811).toBe(false);
    expect(document.cookie).toBe(firstCookie);
    expect(testWindow().ym?.a?.filter((args) => args[1] === "hit")).toHaveLength(2);
  });

  it("captures homepage UTM when consent is given after the page has loaded", async () => {
    window.history.replaceState({}, "", "/?utm_source=telegram&utm_campaign=launch");
    render(<YandexMetrikaConsent />);
    expect(document.cookie).not.toContain("slv_first_touch=");
    await userEvent.setup().click(await screen.findByRole("button", { name: "Разрешить" }));
    expect(decodeURIComponent(document.cookie)).toContain('"utm_campaign":"launch"');
    const hit = testWindow().ym?.a?.find((args) => args[1] === "hit");
    expect(hit?.[2]).not.toContain("?");
  });

  it.each(["/gruppovaya-otkrytka/uchitelyu", "/gruppovaya-otkrytka/vospitatelyu", "/gruppovaya-otkrytka/kollege", "/gruppovaya-otkrytka/den-rozhdeniya"])("asks for consent on a direct visit to %s", async (pathname) => {
    navigation.pathname = pathname;
    window.history.replaceState({}, "", pathname);
    render(<YandexMetrikaConsent />);
    expect(await screen.findByRole("dialog")).toBeInTheDocument();
    expect(document.querySelector("script[data-yandex-metrika]")).toBeNull();
  });

  it("honors a refusal saved in another tab", async () => {
    saveAnalyticsConsent("accepted");
    render(<YandexMetrikaConsent />);
    await waitFor(() => expect(testWindow().disableYaCounter111957811).toBe(false));
    saveAnalyticsConsent("declined");
    window.dispatchEvent(new StorageEvent("storage", { key: ANALYTICS_CONSENT_STORAGE_KEY }));
    await waitFor(() => expect(document.querySelector("script[data-yandex-metrika]")).toBeNull());
    expect(document.cookie).not.toContain("slv_first_touch=");
  });
});
