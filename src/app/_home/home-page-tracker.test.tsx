import { StrictMode } from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { HomePageTracker } from "./home-page-tracker";
import { saveAnalyticsConsent } from "@/lib/client-analytics-consent";
import { removeFirstTouchCookie } from "@/lib/client-landing-attribution";

describe("homepage activity", () => {
  const fetchMock = vi.fn();
  beforeEach(() => {
    window.localStorage.clear();
    removeFirstTouchCookie();
    window.history.replaceState({}, "", "/?utm_source=telegram&utm_campaign=launch&private=secret");
    fetchMock.mockReset().mockResolvedValue({ ok: true });
    vi.stubGlobal("fetch", fetchMock);
  });
  afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

  const fixture = <StrictMode><HomePageTracker />
    <form data-home-action="create" data-home-placement="hero" onSubmit={(event) => event.preventDefault()}>
      <button type="submit">Создать открытку</button>
    </form>
    <a href="/example" data-home-action="example" data-home-placement="templates" onClick={(event) => event.preventDefault()}><span>Пример</span></a>
    <a href="/account" onClick={(event) => event.preventDefault()}>Аккаунт</a>
  </StrictMode>;

  it("counts a view once and counts only marked actions without cookies or referrer", () => {
    saveAnalyticsConsent("declined");
    const { rerender, unmount } = render(fixture);
    rerender(fixture);
    fireEvent.submit(screen.getByRole("button", { name: "Создать открытку" }).closest("form")!);
    fireEvent.click(screen.getByText("Пример"));
    fireEvent.click(screen.getByText("Аккаунт"));
    expect(fetchMock.mock.calls.map(([, options]) => JSON.parse(options.body))).toEqual([
      { event: "home_page_view", context: {} },
      { event: "home_create_click", context: { placement: "hero" } },
      { event: "home_example_click", context: { placement: "templates" } }
    ]);
    for (const [url, options] of fetchMock.mock.calls) {
      expect(url).toBe("/api/telemetry");
      expect(options).toMatchObject({ credentials: "omit", referrerPolicy: "no-referrer", keepalive: true });
      expect(options.body).not.toMatch(/telegram|secret|launch|cardId/);
    }
    expect(document.cookie).not.toContain("slv_first_touch=");
    unmount();
    document.body.innerHTML = '<a href="#" data-home-action="example" data-home-placement="footer">Other page</a>';
    fireEvent.click(screen.getByText("Other page"));
    expect(fetchMock).toHaveBeenCalledTimes(3);
    document.body.innerHTML = "";
  });

  it("captures an accepted campaign locally without adding it to public count requests", () => {
    saveAnalyticsConsent("accepted");
    render(fixture);
    expect(decodeURIComponent(document.cookie)).toContain('"utm_campaign":"launch"');
    expect(fetchMock.mock.calls[0][1].body).not.toContain("launch");
  });

  it("does not let a blocked statistics request break page interaction", async () => {
    fetchMock.mockRejectedValue(new Error("blocked"));
    render(fixture);
    fireEvent.submit(screen.getByRole("button", { name: "Создать открытку" }).closest("form")!);
    await Promise.resolve();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
