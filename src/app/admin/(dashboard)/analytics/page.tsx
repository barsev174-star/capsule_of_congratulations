import Link from "next/link";
import { requireAdminRole } from "@/lib/admin/session";
import { getTelemetrySummary } from "@/lib/telemetry-repository";
import { getAcquisitionAnalytics } from "@/lib/admin/acquisition-analytics";
import { AcquisitionReport } from "./acquisition-report";
import styles from "../../admin.module.css";

const labels: Record<string, string> = {
  "critical.ai": "AI", "critical.database": "База данных", "critical.email": "Email",
  "critical.media": "Фото", "critical.publication": "Публикация", "client.unhandled_error": "Браузер"
};

const aiActionLabels: Record<string, string> = {
  initial: "Первый текст",
  warmer: "Сделать теплее",
  creative: "Творческий",
  alternative: "Ещё вариант",
  expand: "Подробнее",
  shorten: "Короче"
};

const displayModel = (model: string | null) => model?.split("/").at(-1) ?? "—";
const formatTokens = (input: number, cached: number, output: number) =>
  `вход ${input.toLocaleString("ru-RU")}${cached ? `, кэш ${cached.toLocaleString("ru-RU")}` : ""} · выход ${output.toLocaleString("ru-RU")}`;
const formatShare = (value: number) => new Intl.NumberFormat("ru-RU", {
  style: "percent", maximumFractionDigits: 1
}).format(value);
const formatAverageOperations = (value: number, cards: number) => cards
  ? new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 2 }).format(value)
  : "—";
const plural = (value: number, forms: [string, string, string]) => {
  const absolute = Math.abs(value) % 100;
  const last = absolute % 10;
  if (absolute > 10 && absolute < 20) return forms[2];
  if (last === 1) return forms[0];
  if (last > 1 && last < 5) return forms[1];
  return forms[2];
};
const formatUsageDetails = (operations: number, cards: number) =>
  `${operations} ${plural(operations, ["операция", "операции", "операций"])}, ${cards} ${plural(cards, ["открытка", "открытки", "открыток"])}`;

export default async function AnalyticsPage({ searchParams }: { searchParams: Promise<{ days?: string }> }) {
  await requireAdminRole("admin");
  const days = (await searchParams).days === "30" ? 30 : 7;
  const [summary, acquisition] = await Promise.all([getTelemetrySummary(days), getAcquisitionAnalytics(days)]);
  const formatAiCost = (value: number) => summary.aiCost.generations ? `${value.toFixed(3)} ₽` : "—";
  const formatGenerationCost = (value: number, count: number) => count ? `${value.toFixed(3)} ₽` : "—";

  return (
    <>
      <div className={styles.analyticsHeader}>
        <div>
          <h1 className={styles.pageTitle}>Аналитика</h1>
          <p className={styles.pageSubtitle}>Создание, оплата и передача открыток · SEO-источники · работа сервиса</p>
        </div>
        <div className={styles.periodSwitch} aria-label="Период аналитики">
          <Link href="/admin/analytics?days=7" aria-current={days === 7 ? "page" : undefined} className={days === 7 ? styles.periodActive : ""}>7 дней</Link>
          <Link href="/admin/analytics?days=30" aria-current={days === 30 ? "page" : undefined} className={days === 30 ? styles.periodActive : ""}>30 дней</Link>
        </div>
      </div>

      <AcquisitionReport report={acquisition} days={days} />

      <h2 className={styles.panelTitle}>Работа сервиса за период</h2>
      {!acquisition && <p className={styles.analyticsNote}>Локальная телеметрия хранит только последние 10 000 событий; более ранние события могут отсутствовать.</p>}
      <div className={`${styles.statsGrid} ${styles.analyticsStats}`}>
        <div className={styles.statCard}><p className={styles.statValue}>{summary.totalEvents}</p><p className={styles.statLabel}>Всего событий</p></div>
        <div className={styles.statCard}><p className={styles.statValue}>{summary.uniqueCards}</p><p className={styles.statLabel}>Открыток с событиями</p></div>
        <div className={styles.statCard}><p className={styles.statValue}>{summary.criticalErrors}</p><p className={styles.statLabel}>Критических ошибок</p></div>
      </div>

      <section className={`${styles.panel} ${styles.analyticsPanel}`}>
        <h2 className={styles.panelTitle}>Расходы на ИИ</h2>
        <div className={`${styles.statsGrid} ${styles.analyticsStats}`}>
          <div className={styles.statCard}><p className={styles.statValue}>{formatAiCost(summary.aiCost.totalRub)}</p><p className={styles.statLabel}>Всего за период</p></div>
          <div className={styles.statCard}><p className={styles.statValue}>{formatAiCost(summary.aiCost.averageGenerationRub)}</p><p className={styles.statLabel}>В среднем за генерацию</p></div>
          <div className={styles.statCard}><p className={styles.statValue}>{formatAiCost(summary.aiCost.averageCardRub)}</p><p className={styles.statLabel}>В среднем на открытку</p></div>
          <div className={styles.statCard}><p className={styles.statValue}>{formatAiCost(summary.aiCost.extractorRub)}</p><p className={styles.statLabel}>Разбор черновика</p></div>
          <div className={styles.statCard}><p className={styles.statValue}>{formatAiCost(summary.aiCost.composerRub)}</p><p className={styles.statLabel}>Сборка текста</p></div>
          <div className={styles.statCard}><p className={styles.statValue}>{formatAiCost(summary.aiCost.repairRub)}</p><p className={styles.statLabel}>Автоисправления</p></div>
        </div>
        <p className={styles.analyticsNote}>
          {summary.aiCost.generations
            ? `Учтено запусков: ${summary.aiCost.generations}; открыток: ${summary.aiCost.cards}; автоматических исправлений: ${summary.aiCost.repairs}; повторно использован разбор: ${summary.aiCost.cacheHits} раз.`
            : "Данные появятся после первой генерации с учётом стоимости."}
          {" "}Черновики и готовые поздравления здесь не сохраняются.
        </p>

        <section aria-labelledby="ai-decision-metrics-title">
          <h3 id="ai-decision-metrics-title" className={styles.analyticsSubheading}>Показатели для решения по лимитам</h3>
          <div className={`${styles.statsGrid} ${styles.analyticsStats}`}>
          <div className={styles.statCard}>
            <p className={styles.statValue}>{formatGenerationCost(summary.aiCost.averageInitialRub, summary.aiCost.initialGenerations)}</p>
            <p className={styles.statLabel}>Средняя цена первого текста · {summary.aiCost.initialGenerations} запусков</p>
          </div>
          <div className={styles.statCard}>
            <p className={styles.statValue}>{formatGenerationCost(summary.aiCost.averageRepeatRub, summary.aiCost.repeatGenerations)}</p>
            <p className={styles.statLabel}>Средняя цена повторного действия · {summary.aiCost.repeatGenerations} запусков</p>
          </div>
          <div className={styles.statCard}>
            <p className={styles.statValue}>{summary.aiCost.generations ? formatShare(summary.aiCost.repairGenerationShare) : "—"}</p>
            <p className={styles.statLabel}>Запусков с автоисправлениями · {summary.aiCost.generationsWithRepairs} из {summary.aiCost.generations}</p>
          </div>
          <div className={styles.statCard}>
            <p className={styles.statValue}>{summary.aiCost.usageByPayment
              ? formatAverageOperations(summary.aiCost.usageByPayment.before.averagePerCard, summary.aiCost.usageByPayment.before.cards)
              : "—"}</p>
            <p className={styles.statLabel}>Операций на открытку до оплаты{summary.aiCost.usageByPayment
              ? ` · ${formatUsageDetails(summary.aiCost.usageByPayment.before.operations, summary.aiCost.usageByPayment.before.cards)}`
              : ""}</p>
          </div>
          <div className={styles.statCard}>
            <p className={styles.statValue}>{summary.aiCost.usageByPayment
              ? formatAverageOperations(summary.aiCost.usageByPayment.after.averagePerCard, summary.aiCost.usageByPayment.after.cards)
              : "—"}</p>
            <p className={styles.statLabel}>Операций на открытку после оплаты{summary.aiCost.usageByPayment
              ? ` · ${formatUsageDetails(summary.aiCost.usageByPayment.after.operations, summary.aiCost.usageByPayment.after.cards)}`
              : ""}</p>
          </div>
          </div>
          <p className={styles.analyticsNote}>
            Первый текст — действие «initial», повторные — остальные действия актуального сценария. Доля автоисправлений считается по запускам, а не по числу исправлений. Операции до и после оплаты — успешные списываемые из лимита операции за выбранный период; бесплатные служебные операции не учитываются.
            {!summary.aiCost.usageByPayment && " Разделение по оплате доступно только при подключении PostgreSQL."}
          </p>
        </section>

        <h3 className={styles.analyticsSubheading}>Последние запуски</h3>
        {summary.aiCost.recent.length === 0 ? <p className={styles.emptyState}>За выбранный период запусков с детализацией нет.</p> : (
          <div className={styles.tableWrap} tabIndex={0} role="region" aria-label="Детализация расходов на ИИ, таблица">
            <table className={`${styles.table} ${styles.analyticsTable} ${styles.aiCostTable}`}>
              <thead>
                <tr>
                  <th>Время</th><th>Операция</th><th>Модели</th><th>Разбор</th><th>Сборка</th><th>Исправления</th><th>Итого</th><th>Кэш</th><th>Открытка</th>
                </tr>
              </thead>
              <tbody>{summary.aiCost.recent.map((item) => (
                <tr key={item.id}>
                  <td>{new Date(item.createdAt).toLocaleString("ru-RU")}</td>
                  <td>
                    <strong>{item.action ? aiActionLabels[item.action] ?? item.action : "Старый сценарий"}</strong>
                    <span className={styles.cellSecondary}>{item.event === "ai.join_single_generation" ? "один результат" : "три результата"}</span>
                  </td>
                  <td className={styles.aiModelCell}>
                    <span>Разбор: {displayModel(item.extractorModel)}</span>
                    <span>Сборка: {displayModel(item.composerModel)}</span>
                  </td>
                  <td className={styles.aiCostCell}>
                    <strong>{item.extractor.totalRub.toFixed(3)} ₽</strong>
                    <span>{item.cacheHit ? "план из кэша" : formatTokens(item.extractor.inputTokens, item.extractor.cachedInputTokens, item.extractor.outputTokens)}</span>
                  </td>
                  <td className={styles.aiCostCell}>
                    <strong>{item.composer.totalRub.toFixed(3)} ₽</strong>
                    <span>{formatTokens(item.composer.inputTokens, item.composer.cachedInputTokens, item.composer.outputTokens)}</span>
                  </td>
                  <td className={styles.aiCostCell}>
                    <strong>{item.repair.totalRub.toFixed(3)} ₽</strong>
                    <span title={item.repairReasons.join(", ")}>{item.repairCount ? `${item.repairCount} · ${formatTokens(item.repair.inputTokens, item.repair.cachedInputTokens, item.repair.outputTokens)}` : "не понадобились"}</span>
                  </td>
                  <td className={styles.aiCostTotal}>{item.totalCostRub.toFixed(3)} ₽</td>
                  <td><span className={`${styles.badge} ${item.cacheHit ? styles.badgeVisible : styles.aiCacheMiss}`}>{item.cacheHit ? "Да" : "Нет"}</span></td>
                  <td className={styles.monoCell} title={item.cardId ?? undefined}>{item.cardId ? item.cardId.slice(0, 8) : "—"}</td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        )}
      </section>

      <section className={`${styles.panel} ${styles.analyticsPanel}`}>
        <h2 className={styles.panelTitle}>Последние критические ошибки</h2>
        {summary.recentCritical.length === 0 ? <p className={styles.emptyState}>За выбранный период критических ошибок нет.</p> : (
          <div className={styles.tableWrap}><table className={styles.table}>
            <thead><tr><th>Время</th><th>Область</th><th>Код ошибки</th><th>Открытка</th></tr></thead>
            <tbody>{summary.recentCritical.map((item) => <tr key={item.id}>
              <td>{new Date(item.createdAt).toLocaleString("ru-RU")}</td>
              <td><span className={`${styles.badge} ${styles.badgeError}`}>{labels[item.event] ?? item.event}</span></td>
              <td className={styles.monoCell}>{item.errorId ?? "—"}</td>
              <td className={styles.monoCell}>{item.cardId ?? "—"}</td>
            </tr>)}</tbody>
          </table></div>
        )}
      </section>
    </>
  );
}
