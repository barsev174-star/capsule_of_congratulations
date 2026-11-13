import Link from "next/link";
import { listAdminCards } from "@/lib/admin/repository";
import { requireAdminRole } from "@/lib/admin/session";
import { parsePage, parsePeriod, parseFilterDate, formatAdminDate } from "@/lib/admin/format";
import { AdminDataTable, AdminPageHeader, AdminFilterBar, AdminPagination, AdminStatusBadge } from "../../components/admin-ui";
import { AdminStatus } from "../../components/admin-status";
import type { PaymentStatus, CollectionStatus, DeliveryStatus } from "@/lib/cards/types";
import styles from "../../admin.module.css";

type Params = { search?: string; collection?: string; payment?: string; quick?: string; from?: string; to?: string; days?: string; test?: string; page?: string };
export default async function AdminCardsPage({ searchParams }: { searchParams: Promise<Params> }) {
  await requireAdminRole("moderator");
  const params = await searchParams;
  const page = parsePage(params.page);
  const quick = params.quick;
  const collection = quick === "draft" ? "DRAFT" : quick === "open" ? "OPEN" : ["DRAFT", "OPEN", "CLOSED"].includes(params.collection ?? "") ? params.collection as CollectionStatus : undefined;
  const payment = quick === "paid" ? "PAID" : ["UNPAID", "PAID", "REFUNDED", "REVOKED"].includes(params.payment ?? "") ? params.payment as PaymentStatus : undefined;
  const cards = await listAdminCards({ search: params.search?.trim(), collectionStatus: collection, paymentStatus: payment, deliveryStatus: quick === "delivered" ? "DELIVERED" as DeliveryStatus : undefined, from: parseFilterDate(params.from), to: parseFilterDate(params.to), days: params.days ? parsePeriod(params.days) : null, isTest: params.test === "test" ? true : params.test === "real" ? false : undefined, limit: 21, offset: (page - 1) * 20 });
  const quickHref = (value: string) => { const q=new URLSearchParams(); for(const [key,item] of Object.entries(params)) if(item && key!=="page")q.set(key,item); if(value)q.set("quick",value);else q.delete("quick"); if(["draft","open"].includes(value))q.delete("collection");if(value==="paid")q.delete("payment");return `/admin/cards?${q}`; };
  return <>
    <AdminPageHeader title="Открытки" description="Поиск, состояние и безопасное управление открытками." />
    <nav className={styles.tabs} aria-label="Быстрые фильтры">{[["", "Все"], ["draft", "Черновики"], ["open", "Сбор открыт"], ["paid", "Оплачены"], ["delivered", "Переданы"]].map(([value, label]) => <Link key={value} href={quickHref(value)} aria-current={(quick ?? "") === value ? "page" : undefined}>{label}</Link>)}</nav>
    <AdminFilterBar resetHref="/admin/cards">
      <label className={styles.filterField}>Поиск<input type="search" name="search" defaultValue={params.search} placeholder="Получатель, организатор, email или ID" className={styles.searchInput} /></label>
      <label className={styles.filterField}>Сбор<select name="collection" defaultValue={collection ?? ""} className={styles.statusSelect}><option value="">Все</option><option value="DRAFT">Черновик</option><option value="OPEN">Сбор открыт</option><option value="CLOSED">Сбор закрыт</option></select></label>
      <label className={styles.filterField}>Оплата<select name="payment" defaultValue={payment ?? ""} className={styles.statusSelect}><option value="">Все</option><option value="UNPAID">Не оплачено</option><option value="PAID">Оплачено</option><option value="REFUNDED">Возврат</option><option value="REVOKED">Доступ отозван</option></select></label>
      <label className={styles.filterField}>Созданы с<input type="date" name="from" defaultValue={params.from} className={styles.searchInput} /></label>
      <label className={styles.filterField}>Созданы по<input type="date" name="to" defaultValue={params.to} className={styles.searchInput} /></label>
      <label className={styles.filterField}>Период<select name="days" defaultValue={params.days ?? "all"} className={styles.statusSelect}><option value="all">Всё время</option><option value="7">7 дней</option><option value="30">30 дней</option><option value="90">90 дней</option></select></label>
      <label className={styles.filterField}>Тип данных<select name="test" defaultValue={params.test ?? ""} className={styles.statusSelect}><option value="">Все</option><option value="real">Реальные</option><option value="test">Тестовые</option></select></label>
      {quick === "delivered" && <input type="hidden" name="quick" value="delivered" />}
    </AdminFilterBar>
    <section className={styles.panel}><AdminDataTable label="Открытки" rows={cards.slice(0,20)} columns={[
      { key: "recipient", label: "Получатель", render: (card) => <><Link href={`/admin/cards/${card.id}`} className={styles.cardPrimaryLink}>{card.recipientName?.trim() || "Получатель не указан"}</Link><span className={styles.cardId}>ID: {card.id.slice(0,8)}</span>{card.isTest && <AdminStatusBadge>Тестовая</AdminStatusBadge>}</> },
      { key: "occasion", label: "Повод", render: (card) => card.occasionText?.trim() || "Повод не указан" },
      { key: "organizer", label: "Организатор", render: (card) => <>{card.organizerName?.trim() || "Организатор не указан"}<span className={`${styles.cellSecondary} ${styles.emailValue}`} title={card.organizerEmail}>{card.organizerEmail || "Email не указан"}</span></> },
      { key: "status", label: "Состояние", render: (card) => <div className={styles.statusStack}>{card.deletedAt ? <AdminStatusBadge>Удалена</AdminStatusBadge> : <><AdminStatus domain="collection" value={card.collectionStatus ?? "DRAFT"} /><AdminStatus domain="payment" value={card.paymentStatus} />{card.deliveryStatus === "DELIVERED" && <AdminStatus domain="delivery" value="DELIVERED" />}</>}</div> },
      { key: "date", label: "Создана", render: (card) => formatAdminDate(card.createdAt) },
      { key: "action", label: "Действие", render: (card) => <Link href={`/admin/cards/${card.id}`} className={`${styles.detailLink} ${styles.detailLinkPrimary}`}>Открыть</Link> }
    ]} /></section>
    <AdminPagination pathname="/admin/cards" params={params} page={page} hasNext={cards.length > 20} />
  </>;
}
