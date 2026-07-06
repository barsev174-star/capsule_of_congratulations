import Link from "next/link";
import { requireAdminRole } from "@/lib/admin/session";
import { getTelemetrySummary } from "@/lib/telemetry-repository";
import styles from "../../admin.module.css";

const funnelOrder = [
  "funnel.card_creation_started", "funnel.card_created", "funnel.participant_link_copied",
  "funnel.participant_form_opened", "funnel.contribution_submitted", "funnel.card_published", "funnel.gift_opened"
];

const labels: Record<string, string> = {
  "funnel.card_creation_started": "Начали создавать",
  "funnel.card_created": "Создали открытку",
  "funnel.participant_link_copied": "Скопировали приглашение",
  "funnel.participant_form_opened": "Открыли форму участника",
  "funnel.contribution_submitted": "Отправили поздравление",
  "funnel.card_published": "Опубликовали открытку",
  "funnel.gift_opened": "Открыли подарок",
  "critical.ai": "AI", "critical.database": "База данных", "critical.email": "Email",
  "critical.media": "Фото", "critical.publication": "Публикация", "client.unhandled_error": "Браузер"
};

export default async function AnalyticsPage({ searchParams }: { searchParams: Promise<{ days?: string }> }) {
  await requireAdminRole("admin");
  const days = (await searchParams).days === "30" ? 30 : 7;
  const summary = await getTelemetrySummary(days);
  const counts = new Map(summary.funnel.map((item) => [item.event, item.count]));
  const maxCount = Math.max(1, ...funnelOrder.map((event) => counts.get(event) ?? 0));

  return (
    <>
      <div className={styles.analyticsHeader}>
        <div>
          <h1 className={styles.pageTitle}>Аналитика</h1>
          <p className={styles.pageSubtitle}>Путь пользователей и критические ошибки без персональных данных</p>
        </div>
        <div className={styles.periodSwitch} aria-label="Период аналитики">
          <Link href="/admin/analytics?days=7" className={days === 7 ? styles.periodActive : ""}>7 дней</Link>
          <Link href="/admin/analytics?days=30" className={days === 30 ? styles.periodActive : ""}>30 дней</Link>
        </div>
      </div>

      <div className={styles.statsGrid}>
        <div className={styles.statCard}><p className={styles.statValue}>{summary.totalEvents}</p><p className={styles.statLabel}>Всего событий</p></div>
        <div className={styles.statCard}><p className={styles.statValue}>{summary.uniqueCards}</p><p className={styles.statLabel}>Открыток в пути</p></div>
        <div className={styles.statCard}><p className={styles.statValue}>{summary.criticalErrors}</p><p className={styles.statLabel}>Критических ошибок</p></div>
      </div>

      <section className={`${styles.panel} ${styles.analyticsPanel}`}>
        <h2 className={styles.panelTitle}>Воронка</h2>
        <div className={styles.funnelList}>
          {funnelOrder.map((event, index) => {
            const count = counts.get(event) ?? 0;
            const previous = index > 0 ? counts.get(funnelOrder[index - 1]) ?? 0 : 0;
            const conversion = previous > 0 ? Math.round((count / previous) * 100) : null;
            return (
              <div className={styles.funnelRow} key={event}>
                <div className={styles.funnelMeta}><span>{labels[event]}</span><strong>{count}</strong></div>
                <div className={styles.funnelTrack}><span style={{ width: `${Math.max(count ? 3 : 0, count / maxCount * 100)}%` }} /></div>
                <span className={styles.funnelConversion}>{conversion === null ? "—" : `${conversion}% от шага выше`}</span>
              </div>
            );
          })}
        </div>
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
