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
  homeActions: [{ placement: "hero", exampleClicks: 4, createClicks: 7 }],
  participants: { submissions: 10, identities: 3, unidentifiedSubmissions: 2 }
};

const emptySummary = {
  totalEvents: 0,
  uniqueCards: 0,
  criticalErrors: 0,
  recentCritical: [],
  aiCost: {
    generations: 0,
    cards: 0,
    totalRub: 0,
    averageGenerationRub: 0,
    averageCardRub: 0,
    extractorRub: 0,
    composerRub: 0,
    repairRub: 0,
    repairs: 0,
    cacheHits: 0,
    initialGenerations: 0,
    repeatGenerations: 0,
    averageInitialRub: 0,
    averageRepeatRub: 0,
    generationsWithRepairs: 0,
    repairGenerationShare: 0,
    usageByPayment: null,
    recent: []
  }
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
    pageMocks.summary.mockResolvedValue(emptySummary);
    render(await AnalyticsPage({ searchParams: Promise.resolve({ days: "30" }) }));
    expect(pageMocks.acquisition).toHaveBeenCalledWith(30);
    expect(pageMocks.summary).toHaveBeenCalledWith(30);
    expect(screen.getByRole("link", { name: "30 дней" })).toHaveAttribute("aria-current", "page");
  });

  it("shows the cost of each AI stage and recent generation details", async () => {
    pageMocks.authorize.mockResolvedValue({ role: "admin" });
    pageMocks.acquisition.mockResolvedValue(report);
    pageMocks.summary.mockResolvedValue({
      ...emptySummary,
      aiCost: {
        generations: 3,
        cards: 1,
        totalRub: 2.5,
        averageGenerationRub: 2.5 / 3,
        averageCardRub: 2.5,
        extractorRub: 0.4,
        composerRub: 1.95,
        repairRub: 0.15,
        repairs: 1,
        cacheHits: 2,
        initialGenerations: 1,
        repeatGenerations: 2,
        averageInitialRub: 1.25,
        averageRepeatRub: 0.625,
        generationsWithRepairs: 1,
        repairGenerationShare: 1 / 3,
        usageByPayment: {
          before: { operations: 3, cards: 2, averagePerCard: 1.5 },
          after: { operations: 3, cards: 1, averagePerCard: 3 }
        },
        recent: [{
          id: "event-1",
          event: "ai.join_single_generation",
          cardId: "12345678-1234-1234-1234-123456789012",
          createdAt: "2026-08-30T09:00:00.000Z",
          action: "initial",
          extractorModel: "gpt://folder/yandexgpt-5.1",
          composerModel: "gpt://folder/yandexgpt-5.1",
          cacheHit: false,
          extractor: { totalRub: 0.2, inputTokens: 100, cachedInputTokens: 0, outputTokens: 40, totalTokens: 140 },
          composer: { totalRub: 0.9, inputTokens: 300, cachedInputTokens: 0, outputTokens: 120, totalTokens: 420 },
          repair: { totalRub: 0.15, inputTokens: 50, cachedInputTokens: 0, outputTokens: 20, totalTokens: 70 },
          repairCount: 1,
          repairReasons: ["missing_wish"],
          totalCostRub: 1.25
        }]
      }
    });

    render(await AnalyticsPage({ searchParams: Promise.resolve({}) }));
    expect(screen.getByRole("region", { name: "Детализация расходов на ИИ, таблица" })).toBeInTheDocument();
    expect(screen.getByText("Первый текст")).toBeInTheDocument();
    expect(screen.getAllByText("1.250 ₽").length).toBeGreaterThan(0);
    expect(screen.getAllByText(/yandexgpt-5\.1/)).toHaveLength(2);
    const decisionMetrics = screen.getByRole("region", { name: "Показатели для решения по лимитам" });
    expect(within(decisionMetrics).getByText("0.625 ₽")).toBeInTheDocument();
    expect(within(decisionMetrics).getByText(/33,3.*%/)).toBeInTheDocument();
    expect(within(decisionMetrics).getByText("1,5")).toBeInTheDocument();
    expect(within(decisionMetrics).getByText("3")).toBeInTheDocument();
    expect(within(decisionMetrics).getByText(/3 операции, 2 открытки/)).toBeInTheDocument();
    expect(within(decisionMetrics).getByText(/3 операции, 1 открытка/)).toBeInTheDocument();
  });

  it("separates the card cohort, SEO events and participant counts", () => {
    render(<AcquisitionReport report={report} days={7} />);
    const journey = screen.getByRole("region", { name: "Путь открыток" });
    expect(within(journey).getAllByText("50% от созданных")).toHaveLength(2);
    expect(within(journey).getAllByText("100% от созданных")).toHaveLength(2);
    expect(screen.queryByText(/от шага выше/)).not.toBeInTheDocument();
    const seo = screen.getByRole("region", { name: "Главная и тематические страницы" });
    expect(within(seo).getAllByRole("link")).toHaveLength(5);
    expect(within(seo).getByRole("link", { name: "Главная" })).toHaveAttribute("href", "/");
    expect(within(seo).getByRole("link", { name: "День рождения" })).toHaveAttribute("href", "/gruppovaya-otkrytka/den-rozhdeniya");
    expect(within(seo).getByText(/не уникальные посетители/)).toBeInTheDocument();
    expect(screen.getByText("Страница входа не определена")).toBeInTheDocument();
    const actions = screen.getByRole("region", { name: "Нажатия на главной, таблица" });
    expect(within(actions).getByRole("row", { name: "Первый экран 4 7" })).toBeInTheDocument();
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
