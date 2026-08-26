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

type TestWindow = Window & {
  ym?: ((...args: unknown[]) => void) & { a?: unknown[][] };
  __slovestoMetrikaInitialized?: boolean;
  disableYaCounter111957811?: boolean;
};

const testWindow = () => window as TestWindow;

describe("YandexMetrikaConsent", () => {
  beforeEach(() => {
    navigation.pathname = "/";
    window.localStorage.clear();
    document.querySelectorAll("script[data-yandex-metrika]").forEach((script) => script.remove());
    delete testWindow().ym;
    delete testWindow().__slovestoMetrikaInitialized;
    delete testWindow().disableYaCounter111957811;
  });

  afterEach(cleanup);

  it("does not load the counter before explicit consent", async () => {
    render(<YandexMetrikaConsent />);
    expect(await screen.findByRole("heading", { name: "Помочь нам улучшать Slovesto?" })).toBeInTheDocument();
    expect(document.querySelector("script[data-yandex-metrika]")).toBeNull();
    expect(testWindow().disableYaCounter111957811).toBe(true);
  });

  it("keeps Metrika disabled after refusal", async () => {
    const user = userEvent.setup();
    render(<YandexMetrikaConsent />);
    await user.click(await screen.findByRole("button", { name: "Не использовать" }));
    expect(window.localStorage.getItem(ANALYTICS_CONSENT_STORAGE_KEY)).toBe("declined");
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
    expect(window.localStorage.getItem(ANALYTICS_CONSENT_STORAGE_KEY)).toBe("accepted");
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
    window.localStorage.setItem(ANALYTICS_CONSENT_STORAGE_KEY, "accepted");
    render(<YandexMetrikaConsent />);
    await waitFor(() => expect(testWindow().disableYaCounter111957811).toBe(true));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(document.querySelector("script[data-yandex-metrika]")).toBeNull();
  });

  it("reopens preferences and lets a visitor revoke a previous choice", async () => {
    const user = userEvent.setup();
    window.localStorage.setItem(ANALYTICS_CONSENT_STORAGE_KEY, "accepted");
    render(<YandexMetrikaConsent />);
    await waitFor(() => expect(document.querySelector("script[data-yandex-metrika]")).not.toBeNull());
    window.dispatchEvent(new Event(ANALYTICS_PREFERENCES_EVENT));
    await user.click(await screen.findByRole("button", { name: "Не использовать" }));
    expect(window.localStorage.getItem(ANALYTICS_CONSENT_STORAGE_KEY)).toBe("declined");
    expect(testWindow().disableYaCounter111957811).toBe(true);
  });
});
