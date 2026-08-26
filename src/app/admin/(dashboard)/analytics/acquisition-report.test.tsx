import { cleanup, render, screen, within } from "@testing-library/react";
import { AcquisitionReport } from "./acquisition-report";
import { emptyAcquisitionCounts, type AcquisitionAnalytics } from "@/lib/admin/acquisition-analytics";

const pageMocks = vi.hoisted(() => ({ authorize: vi.fn(), acquisition: vi.fn(), summary: vi.fn() }));
vi.mock("@/lib/admin/session", () => ({ requireAdminRole: pageMocks.authorize }));
vi.mock("@/lib/telemetry-repository", () => ({ getTelemetrySummary: pageMocks.summary }));
vi.mock("@/lib/admin/acquisition-analytics", async (original) => ({
  ...await original<typeof import("@/lib/admin/acquisition-analytics")>(), getAcquisitionAnalytics: pageMocks.acquisition
}));
import AnalyticsPage from "./page";

afterEach(cleanup);

const report: AcquisitionAnalytics = {
  totals: { ...emptyAcquisitionCounts(), created: 2, paid: 1, delivered: 2, opened: 1, paidOrders: 1, grossKopecks: 39900 },
  sources: [
    { ...emptyAcquisitionCounts(), created: 1, paid: 1, paidOrders: 1, grossKopecks: 39900, landing: "teacher", source: "yandex", medium: "organic", campaign: "school" },
    { ...emptyAcquisitionCounts(), created: 1, landing: null, source: null, medium: null, campaign: null }
  ],
  landings: [{ landing: "teacher", views: 10, exampleClicks: 2, createClicks: 3 }],
  participants: { submissions: 10, identities: 3, unidentifiedSubmissions: 2 }
};

describe("acquisition report UI", () => {
  beforeEach(() => vi.clearAllMocks());

  it("checks admin permission before reading analytics", async () => {
    pageMocks.authorize.mockRejectedValueOnce(new Error("Forbidden"));
    await expect(AnalyticsPage({ searchParams: Promise.resolve({}) })).rejects.toThrow("Forbidden");
    expect(pageMocks.authorize).toHaveBeenCalledWith("admin");
    expect(pageMocks.acquisition).not.toHaveBeenCalled();
    expect(pageMocks.summary).not.toHaveBeenCalled();
  });

  it("switches both reports to the requested period and exposes the selected link", async () => {
    pageMocks.authorize.mockResolvedValue({ role: "admin" });
    pageMocks.acquisition.mockResolvedValue(report);
    pageMocks.summary.mockResolvedValue({ totalEvents: 0, uniqueCards: 0, criticalErrors: 0, recentCritical: [], aiCost: { generations: 0 } });
    render(await AnalyticsPage({ searchParams: Promise.resolve({ days: "30" }) }));
    expect(pageMocks.acquisition).toHaveBeenCalledWith(30);
    expect(pageMocks.summary).toHaveBeenCalledWith(30);
    expect(screen.getByRole("link", { name: "30 дней" })).toHaveAttribute("aria-current", "page");
  });

  it("separates the card cohort, SEO events and participant counts", () => {
    render(<AcquisitionReport report={report} days={7} />);
    const journey = screen.getByRole("region", { name: "Путь открыток" });
    expect(within(journey).getAllByText("50% от созданных")).toHaveLength(2);
    expect(within(journey).getAllByText("100% от созданных")).toHaveLength(2);
    expect(screen.queryByText(/от шага выше/)).not.toBeInTheDocument();
    const seo = screen.getByRole("region", { name: "SEO-страницы" });
    expect(within(seo).getAllByRole("link")).toHaveLength(4);
    expect(within(seo).getByRole("link", { name: "День рождения" })).toHaveAttribute("href", "/gruppovaya-otkrytka/den-rozhdeniya");
    expect(within(seo).getByText(/не уникальные посетители/)).toBeInTheDocument();
    expect(screen.getByText("Без SEO-атрибуции")).toBeInTheDocument();
    expect(screen.getByText(/не точное число людей/)).toBeInTheDocument();
    expect(screen.getByRole("region", { name: /Источники открыток, таблица/ })).toHaveAttribute("tabindex", "0");
  });

  it("distinguishes no data from zero conversion", () => {
    render(<AcquisitionReport report={{ ...report, sources: [], totals: emptyAcquisitionCounts() }} days={30} />);
    expect(screen.getByText("За этот период ещё не создали открыток.")).toBeInTheDocument();
    expect(screen.queryByText("0% от созданных")).not.toBeInTheDocument();
  });

  it("does not present unverified local payments as zero", () => {
    render(<AcquisitionReport report={null} days={7} />);
    expect(screen.getByText(/продажи и конверсии не рассчитываются/)).toBeInTheDocument();
    expect(screen.queryByText("Подтверждённые платежи")).not.toBeInTheDocument();
  });
});
