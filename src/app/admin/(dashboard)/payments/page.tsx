import Link from "next/link";
import { requireAdminRole } from "@/lib/admin/session";
import { listAdminPaymentAttempts } from "@/lib/admin/finances";
import { formatAdminDate, formatMoney, parsePage, parsePeriod } from "@/lib/admin/format";
import { AdminDataTable, AdminFilterBar, AdminPageHeader, AdminPagination } from "../../components/admin-ui";
import { AdminStatus } from "../../components/admin-status";
import styles from "../../admin.module.css";
type Params = { status?: string; search?: string; days?: string; page?: string; order?: string };
export default async function AdminPaymentsPage({ searchParams }: { searchParams: Promise<Params> }) {
  await requireAdminRole("admin");
  const params = await searchParams, page = parsePage(params.page);
  const orderId = /^[0-9a-f-]{36}$/i.test(params.order ?? "") ? params.order : undefined;
  const rows = await listAdminPaymentAttempts({ status:["PENDING","SUCCEEDED","CANCELED","EXPIRED"].includes(params.status ?? "") ? params.status : undefined, search:params.search?.trim(), days:params.days ? parsePeriod(params.days) : null, orderId, limit:21, offset:(page-1)*20 });
  return <><AdminPageHeader title="Платежи" description="Попытки оплаты и идентификаторы операций провайдера."><Link className={styles.detailLink} href="/admin/merchant-accounts">Платёжные аккаунты</Link></AdminPageHeader>
    <AdminFilterBar resetHref="/admin/payments">
      <label className={styles.filterField}>Поиск<input className={styles.searchInput} type="search" name="search" defaultValue={params.search} placeholder="ID операции, попытки или заказа" /></label>
      <label className={styles.filterField}>Статус<select className={styles.statusSelect} name="status" defaultValue={params.status ?? ""}><option value="">Все</option><option value="PENDING">Ожидает оплаты</option><option value="SUCCEEDED">Оплачено</option><option value="CANCELED">Отменено</option><option value="EXPIRED">Срок истёк</option></select></label>
      <label className={styles.filterField}>Период<select className={styles.statusSelect} name="days" defaultValue={params.days ?? "all"}><option value="all">Всё время</option><option value="7">7 дней</option><option value="30">30 дней</option><option value="90">90 дней</option></select></label>
      {orderId && <input type="hidden" name="order" value={orderId} />}
    </AdminFilterBar>
    <section className={styles.panel}><AdminDataTable rows={rows.slice(0,20)} label="Платёжные попытки" columns={[
      { key:"order",label:"Заказ",render:(a) => <Link href={`/admin/orders/${a.orderId}`}>#{a.orderId.slice(0,8)}</Link> },
      { key:"amount",label:"Сумма",render:(a) => formatMoney(a.amount,a.currency) },
      { key:"date",label:"Дата",render:(a) => formatAdminDate(a.createdAt,true) },
      { key:"status",label:"Статус",render:(a) => <AdminStatus domain="attempt" value={a.status} /> },
      { key:"provider",label:"Провайдер / операция",render:(a) => <>{a.provider}<span className={styles.cellSecondary}>{a.providerPaymentId ?? "Не присвоен"}</span></> },
      { key:"action",label:"Действие",render:(a) => <Link className={styles.detailLink} href={`/admin/payments/${a.id}`}>Подробнее</Link> }
    ]} empty="Платёжные попытки не найдены." /></section><AdminPagination pathname="/admin/payments" params={params} page={page} hasNext={rows.length>20} /></>;
}
