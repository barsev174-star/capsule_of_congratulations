import Link from "next/link";
import { requireAdminRole } from "@/lib/admin/session";
import { getAdminOverview } from "@/lib/admin/overview";
import { comparePeriod, formatAdminDate, formatMoney, parsePeriod } from "@/lib/admin/format";
import { AdminEmptyState, AdminPageHeader, AdminStatCard, AdminDetailPanel, AdminStatusBadge } from "../components/admin-ui";
import { AdminPeriodSwitch } from "../components/admin-period-switch";
import { AdminDisclosure } from "../components/admin-disclosure";
import styles from "../admin.module.css";

export default async function AdminDashboardPage({ searchParams }: { searchParams: Promise<{ days?: string }> }) {
  const session = await requireAdminRole("support");
  const days = parsePeriod((await searchParams).days);
  const report = await getAdminOverview(days, session.role);
  if (!report) return <><AdminPageHeader title="Обзор" /><AdminEmptyState>Нет данных. Для бизнес-показателей требуется платёжный реестр PostgreSQL.</AdminEmptyState></>;
  const { current, previous, total, attention } = report;
  const problems = [
    { count: attention.support, label: "Новые обращения", href: "/admin/support?status=new" },
    { count: attention.reminders, label: "Ошибки отправки напоминаний", href: "/admin/reminders?status=failed" },
    { count: attention.refunds, label: "Неуспешные возвраты", href: "/admin/orders?problem=refund" },
    { count: attention.technical, label: "Ошибки публикации и медиа за 7 дней", href: "/admin/analytics?tab=technical&days=7" }
  ].filter((item) => item.count > 0);
  return <>
    <AdminPageHeader title="Обзор" description="Главное о Slovesto: открытки, оплаты и события, требующие внимания."><AdminPeriodSwitch pathname="/admin" days={days} /></AdminPageHeader>
    <div className={styles.statsGrid}>
      <AdminStatCard label="Новые открытки" value={current.created} detail={comparePeriod(current.created, previous?.created ?? null)} />
      <AdminStatCard label="Оплаченные открытки" value={current.paid ?? "Нет доступа"} detail={current.paid === null ? "Доступно администратору" : comparePeriod(current.paid, previous?.paid ?? null)} />
      <AdminStatCard label="Выручка" value={current.revenue === null ? "Нет доступа" : formatMoney(current.revenue)} detail={current.revenue === null ? "Доступно администратору" : comparePeriod(current.revenue, previous?.revenue ?? null)} />
      <AdminStatCard label="Активные сборы" value={current.active} detail="Открыты сейчас" />
    </div>
    <AdminDetailPanel title="Требуют внимания">{problems.length ? <ul className={styles.activityList}>{problems.map((item) => <li key={item.href}><Link href={item.href}><span>{item.label}</span><AdminStatusBadge tone="warning">{item.count}</AdminStatusBadge></Link></li>)}</ul> : <p className={styles.analyticsNote}>Всё в порядке. Сейчас нет событий, требующих внимания.</p>}</AdminDetailPanel>
    <div className={styles.twoColumns}>
      <AdminDetailPanel title="Последняя активность">{report.activity.length ? <ul className={styles.activityList}>{report.activity.map((item) => <li key={item.id}>{item.href ? <Link href={item.href}><span>{item.label}</span><time dateTime={item.date}>{formatAdminDate(item.date, true)}</time></Link> : <div className={styles.activityEntry}><span>{item.label}</span><time dateTime={item.date}>{formatAdminDate(item.date, true)}</time></div>}</li>)}</ul> : <AdminEmptyState>Значимых событий пока нет.</AdminEmptyState>}</AdminDetailPanel>
      {session.role === "admin" && <AdminDetailPanel title="Напоминания"><div className={styles.miniStats}><div className={styles.miniStat}><span>Новые заявки<br />за выбранный период</span><strong>{current.reminders}</strong></div><div className={styles.miniStat}><span>Ожидают отправки<br />сейчас</span><strong className={styles.valuewarning}>{report.remindersPending}</strong></div><Link href="/admin/reminders?status=failed" className={styles.miniStat}><span>Ошибки отправки<br />сейчас</span><strong className={styles.valueerror}>{attention.reminders}</strong></Link></div><p className={styles.analyticsNote}>Создание новых открыток после напоминания: связь не отслеживается.</p><Link href="/admin/reminders" className={styles.detailLink}>Все напоминания</Link></AdminDetailPanel>}
    </div>
    <AdminDetailPanel title="За всё время"><div className={styles.compactStats}><span>Открытки: <strong>{total.cards}</strong></span><span>Поздравления: <strong>{total.greetings}</strong></span><span>Фото: <strong>{total.photos}</strong></span><span>Переданы: <strong>{total.delivered}</strong></span></div></AdminDetailPanel>
    <p className={styles.analyticsNote}>Время: Екатеринбург (UTC+5).</p><AdminDisclosure><p className={styles.analyticsNote}>Тестовые открытки исключены. Период: {days === null ? "всё время" : `последние ${days} дней до текущего момента`}. Время: Екатеринбург (UTC+5). Оплаченные открытки считаются один раз за период; выручка — подтверждённые боевые поступления минус завершённые возвраты по датам операций. Административный доступ не считается оплатой.</p></AdminDisclosure>
  </>;
}
