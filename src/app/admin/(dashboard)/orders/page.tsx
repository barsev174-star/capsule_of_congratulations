import Link from "next/link";
import { listPaymentOrders } from "@/lib/admin/repository-phase2";
import type { PaymentOrderStatus } from "@/lib/admin/types";
import { requireAdminRole } from "@/lib/admin/session";
import { formatAdminDate, formatMoney, parsePage, parsePeriod } from "@/lib/admin/format";
import { AdminDataTable, AdminFilterBar, AdminPageHeader, AdminPagination } from "../../components/admin-ui";
import { AdminStatus } from "../../components/admin-status";
import styles from "../../admin.module.css";
const statuses = ["CREATED", "PAID", "PARTIALLY_REFUNDED", "REFUNDED", "CANCELED", "REVOKED"] as const;
const labels = ["Ожидает оплаты", "Оплачен", "Частичный возврат", "Возврат", "Отменён", "Отозван"];
type Params = { status?: string; search?: string; days?: string; page?: string; problem?: string };
export default async function AdminOrdersPage({ searchParams }: { searchParams: Promise<Params> }) {
  await requireAdminRole("admin");
  const params = await searchParams, page = parsePage(params.page);
  const rows = await listPaymentOrders({ status: statuses.includes(params.status as PaymentOrderStatus) ? params.status as PaymentOrderStatus : undefined, search: params.search?.trim(), days: params.days ? parsePeriod(params.days) : null, problem: params.problem === "refund" ? "refund" : undefined, limit: 21, offset: (page-1)*20 });
  return <><AdminPageHeader title="Заказы" description="Заказ и его платёжные попытки — отдельные объекты." />
    <AdminFilterBar resetHref="/admin/orders">
      <label className={styles.filterField}>Поиск<input className={styles.searchInput} name="search" type="search" defaultValue={params.search} placeholder="Получатель, email, ID заказа или открытки" /></label>
      <label className={styles.filterField}>Статус<select className={styles.statusSelect} name="status" defaultValue={params.status ?? ""}><option value="">Все</option>{statuses.map((s,i) => <option key={s} value={s}>{labels[i]}</option>)}</select></label>
      <label className={styles.filterField}>Период<select className={styles.statusSelect} name="days" defaultValue={params.days ?? "all"}><option value="all">Всё время</option><option value="7">7 дней</option><option value="30">30 дней</option><option value="90">90 дней</option></select></label>
      <label className={styles.filterField}>Требуют внимания<select className={styles.statusSelect} name="problem" defaultValue={params.problem ?? ""}><option value="">Все</option><option value="refund">Неуспешные возвраты</option></select></label>
    </AdminFilterBar>
    <section className={styles.panel}><AdminDataTable rows={rows.slice(0,20)} label="Заказы" columns={[
      { key:"card", label:"Открытка", render:(o) => <><Link href={`/admin/cards/${o.cardId}`}>{o.recipientName?.trim() || "Получатель не указан"}</Link><span className={`${styles.cellSecondary} ${styles.emailValue}`} title={o.organizerEmail}>{o.organizerEmail}</span></> },
      { key:"amount", label:"Сумма", render:(o) => formatMoney(o.amount,o.currency) },
      { key:"status", label:"Статус", render:(o) => <AdminStatus domain="order" value={o.status} /> },
      { key:"date", label:"Создан", render:(o) => formatAdminDate(o.createdAt,true) },
      { key:"action", label:"Действие", render:(o) => <Link className={styles.detailLink} href={`/admin/orders/${o.id}`}>Открыть</Link> }
    ]} empty="Заказы не найдены." /></section><AdminPagination pathname="/admin/orders" params={params} page={page} hasNext={rows.length>20} /></>;
}
