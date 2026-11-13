import Link from "next/link";
import { requireAdminRole } from "@/lib/admin/session";
import { listAdminReminders } from "@/lib/admin/reminders";
import { formatAdminDate, parseFilterDate, parsePage } from "@/lib/admin/format";
import { AdminDataTable, AdminFilterBar, AdminPageHeader, AdminPagination, AdminStatusBadge } from "../../components/admin-ui";
import { AdminStatus } from "../../components/admin-status";
import styles from "../../admin.module.css";
type Params = { status?: string; search?: string; from?: string; to?: string; eventDate?: string; occasion?: string; page?: string };
export default async function AdminRemindersPage({ searchParams }: { searchParams: Promise<Params> }) {
  await requireAdminRole("admin");
  const params = await searchParams, page = parsePage(params.page);
  const status = ["pending","sending","sent","failed","cancelled"].includes(params.status ?? "") ? params.status : undefined;
  const rows = await listAdminReminders({ ...params, status, from: parseFilterDate(params.from), to: parseFilterDate(params.to), eventDate: parseFilterDate(params.eventDate), limit: 21, offset: (page - 1) * 20 });
  const quickHref = (value: string) => { const q=new URLSearchParams();for(const [key,item] of Object.entries(params))if(item&&key!=="page")q.set(key,item);if(value)q.set("status",value);else q.delete("status");return `/admin/reminders?${q}`; };
  return <>
    <AdminPageHeader title="Напоминания" description="Заявки со страницы участника /join. Исходная открытка и результат напоминания учитываются отдельно." />
    <nav className={styles.tabs} aria-label="Статус отправки">{[["", "Все"],["pending","Ожидают отправки"],["sent","Отправлены"],["failed","Ошибки"],["cancelled","Отменены"]].map(([value,label]) => <Link key={value} href={quickHref(value)} aria-current={(status ?? "") === value ? "page" : undefined}>{label}</Link>)}</nav>
    <AdminFilterBar resetHref="/admin/reminders">
      {status && <input type="hidden" name="status" value={status} />}
      <label className={styles.filterField}>Email<input className={styles.searchInput} name="search" type="search" defaultValue={params.search} placeholder="Поиск по email" /></label>
      <label className={styles.filterField}>Созданы с<input className={styles.searchInput} type="date" name="from" defaultValue={params.from} /></label>
      <label className={styles.filterField}>Созданы по<input className={styles.searchInput} type="date" name="to" defaultValue={params.to} /></label>
      <label className={styles.filterField}>Дата события<input className={styles.searchInput} type="date" name="eventDate" defaultValue={params.eventDate} /></label>
      <label className={styles.filterField}>Событие<input className={styles.searchInput} name="occasion" defaultValue={params.occasion} placeholder="Название события" /></label>
    </AdminFilterBar>
    <section className={styles.panel}><AdminDataTable rows={rows.slice(0,20)} label="Заявки на напоминания" columns={[
      { key: "request", label: "Заявка", width: "25%", render: (r) => <><span className={styles.dateCell}>{formatAdminDate(r.createdAt, true)}</span><span className={`${styles.cellSecondary} ${styles.emailValue}`} title={r.email}>{r.email}</span></> },
      { key: "event", label: "Событие", width: "27%", mobilePrimary: true, render: (r) => <><strong>{r.occasionText}</strong><span className={styles.cellSecondary}>{r.recipientName}</span><span className={styles.cellSecondary}>{formatAdminDate(r.eventDate)}</span></> },
      { key: "schedule", label: "Напоминание", width: "18%", render: (r) => r.remindOn ? formatAdminDate(r.remindOn) : "Без отдельной отправки" },
      { key: "status", label: "Статус", width: "18%", render: (r) => r.status === "cancelled" ? <AdminStatus domain="reminder" value={r.status} /> : r.schedule === "confirmation_only" ? <AdminStatusBadge>Не запланирована</AdminStatusBadge> : <AdminStatus domain="reminder" value={r.status} /> },
      { key: "action", label: "Действие", width: "132px", render: (r) => <Link className={styles.detailLink} href={`/admin/reminders/${r.id}`}>Подробнее</Link> }
    ]} empty="Заявок на напоминания пока нет." /></section>
    <AdminPagination pathname="/admin/reminders" params={params} page={page} hasNext={rows.length > 20} />
  </>;
}
