import Link from "next/link";
import { requireAdminRole } from "@/lib/admin/session";
import { getTelemetrySummary } from "@/lib/telemetry-repository";
import { getAcquisitionAnalytics } from "@/lib/admin/acquisition-analytics";
import { getAdminReminderAnalytics } from "@/lib/admin/reminders";
import { parsePeriod, formatAdminDate } from "@/lib/admin/format";
import { AcquisitionReport } from "./acquisition-report";
import { AiReport } from "./ai-report";
import { AdminPeriodSwitch } from "../../components/admin-period-switch";
import { AdminDataTable, AdminDetailPanel, AdminEmptyState, AdminPageHeader, AdminStatCard, AdminStatusBadge } from "../../components/admin-ui";
import { AdminDisclosure } from "../../components/admin-disclosure";
import { AdminAnalyticsTabs } from "../../components/admin-analytics-tabs";
import { AdminCopyValue } from "../../components/admin-copy-value";
import styles from "../../admin.module.css";
const labels: Record<string,string> = { "critical.ai":"ИИ", "critical.database":"База данных", "critical.email":"Email", "critical.media":"Фото", "critical.publication":"Публикация", "client.unhandled_error":"Браузер" };
export default async function AnalyticsPage({ searchParams }: { searchParams: Promise<{ days?: string; tab?: string }> }) {
  await requireAdminRole("admin");
  const params=await searchParams, days=parsePeriod(params.days);
  const tab=["funnel","sources","reminders","ai","technical"].includes(params.tab ?? "") ? params.tab! : "funnel";
  const acquisition=tab==="funnel" || tab==="sources" ? await getAcquisitionAnalytics(days) : null;
  const summary=tab==="ai" || tab==="technical" ? await getTelemetrySummary(days) : null;
  const reminders=tab==="reminders" ? await getAdminReminderAnalytics(days) : null;
  return <>
    <AdminPageHeader title="Аналитика" description="Бизнес-показатели и работа сервиса по темам."><AdminPeriodSwitch pathname="/admin/analytics" days={days} params={{tab}} /></AdminPageHeader>
    <AdminAnalyticsTabs tab={tab} days={days} />
    {(tab==="funnel" || tab==="sources") && <AcquisitionReport report={acquisition} days={days} mode={tab} />}
    {tab==="reminders" && <AdminDetailPanel title="Статистика напоминаний">{reminders ? <>
      <div className={`${styles.statsGrid} ${styles.compactKpis}`}><AdminStatCard label="Заявки за период" value={reminders.requests} /><AdminStatCard label="Предусмотрена отправка" value={reminders.scheduled} /><AdminStatCard label="Передано почтовому сервису" value={reminders.sent} tone="success" /><AdminStatCard label="Ожидают отправки" value={reminders.pending} tone="warning" /><AdminStatCard label="Ошибки" value={reminders.failed} tone="error" /></div>
      <p className={styles.analyticsNote}>Создание открыток после отправки пока не отслеживается.</p><AdminDisclosure><p className={styles.analyticsNote}>Когорта: заявки, созданные за выбранный период, и их состояние сейчас. Письмо о сохранении заявки учитывается отдельно от запланированного напоминания.</p>
      <p className={styles.analyticsNote}>Заявки → отправлено: {reminders.scheduled ? `${new Intl.NumberFormat("ru-RU",{maximumFractionDigits:1}).format(reminders.sent/reminders.scheduled*100)}% от заявок с запланированной отправкой` : "Нет данных"}. Создана открытка → оплачена: связь не отслеживается.</p></AdminDisclosure><Link className={styles.detailLink} href="/admin/reminders">Открыть заявки</Link>
    </> : <AdminEmptyState>Нет данных. Требуется PostgreSQL.</AdminEmptyState>}</AdminDetailPanel>}
    {tab==="ai" && summary && <AiReport summary={summary} />}
    {tab==="technical" && summary && <>
      <div className={styles.statsGrid}><AdminStatCard label="События за период" value={summary.totalEvents} /><AdminStatCard label="Открытки с событиями" value={summary.uniqueCards} /><AdminStatCard label="Ошибки за период" value={summary.criticalErrors} tone="error" /></div>
      <AdminDetailPanel title="Последние ошибки"><AdminDataTable label="Критические ошибки" rows={summary.recentCritical} columns={[
        { key:"date",label:"Время",render:(e) => formatAdminDate(e.createdAt,true) },
        { key:"area",label:"Область",render:(e) => <AdminStatusBadge tone="error">{labels[e.event] ?? e.event}</AdminStatusBadge> },
        { key:"id",label:"ID события",render:(e) => <AdminCopyValue value={e.id} label="ID события" compact /> },
        { key:"card",label:"Открытка",render:(e) => e.cardId && /^[0-9a-f-]{36}$/i.test(e.cardId) ? <Link href={`/admin/cards/${e.cardId}`}>#{e.cardId.slice(0,8)}</Link> : "Нет связи" }
        ,{ key:"details",label:"Действие",width:"132px",render:(e) => <Link className={styles.detailLink} href={`/admin/analytics/events/${e.id}?days=${days ?? "all"}`}>Подробнее</Link> }
      ]} empty="За выбранный период ошибок нет." /><p className={styles.analyticsNote}>Исторические события за период. Состояние устранения не отслеживается.</p></AdminDetailPanel>
    </>}
    <AdminDisclosure><p className={styles.analyticsNote}>Тестовые открытки исключены из отчётов. События без связи с открыткой нельзя классифицировать как тестовые. Даты показаны по Екатеринбургу (UTC+5).</p></AdminDisclosure>
  </>;
}
