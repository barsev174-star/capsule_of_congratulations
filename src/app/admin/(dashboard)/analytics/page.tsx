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

export default async function AnalyticsPage({ searchParams }: { searchParams: Promise<{ days?: string }> }) {
  await requireAdminRole("admin");
  const days = (await searchParams).days === "30" ? 30 : 7;
  const [summary, acquisition] = await Promise.all([getTelemetrySummary(days), getAcquisitionAnalytics(days)]);
  const formatAiCost = (value: number) => summary.aiCost.generations ? `${value.toFixed(3)} ₽` : "—";

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
        </div>
        <p className={styles.emptyState}>{summary.aiCost.generations ? `Учтено генераций: ${summary.aiCost.generations}; открыток: ${summary.aiCost.cards}.` : "Данные появятся после первой двухшаговой генерации с новой версией учёта."} Черновики и тексты поздравлений здесь не сохраняются.</p>
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
