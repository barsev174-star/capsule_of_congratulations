import Link from "next/link";
import { listPaymentOrders } from "@/lib/admin/repository-phase2";
import type { PaymentOrderStatus } from "@/lib/admin/types";
import { requireAdminRole } from "@/lib/admin/session";
import styles from "../../admin.module.css";

const orderStatusOptions = [
  { value: "", label: "Все статусы" },
  { value: "CREATED", label: "Ожидает оплаты" },
  { value: "PAID", label: "Оплачен" },
  { value: "PARTIALLY_REFUNDED", label: "Частичный возврат" },
  { value: "REFUNDED", label: "Возврат" },
  { value: "CANCELED", label: "Отменён" },
  { value: "REVOKED", label: "Отозван" }
] as const;

const orderStatuses: PaymentOrderStatus[] = ["CREATED", "PAID", "PARTIALLY_REFUNDED", "REFUNDED", "CANCELED", "REVOKED"];
const isPaymentOrderStatus = (value: string): value is PaymentOrderStatus =>
  orderStatuses.includes(value as PaymentOrderStatus);

const statusLabels: Record<string, string> = {
  CREATED: "Ожидает оплаты",
  PAID: "Оплачен",
  PARTIALLY_REFUNDED: "Частичный возврат",
  REFUNDED: "Возврат",
  CANCELED: "Отменён",
  REVOKED: "Отозван"
};

const statusBadgeClass: Record<string, string> = {
  CREATED: styles.badgeDraft,
  PAID: styles.badgeReady,
  PARTIALLY_REFUNDED: styles.badgeHidden,
  REFUNDED: styles.badgeHidden,
  CANCELED: styles.badgeDeleted,
  REVOKED: styles.badgeDeleted
};

type Props = {
  searchParams: Promise<{
    status?: string;
    search?: string;
  }>;
};

export default async function AdminOrdersPage({ searchParams }: Props) {
  await requireAdminRole("admin");
  const { status, search } = await searchParams;
  const statusValue = status && isPaymentOrderStatus(status) ? status : undefined;
  const orders = await listPaymentOrders({
    status: statusValue,
    search: search?.trim() || undefined,
    limit: 50
  });

  return (
    <>
      <h1 className={styles.pageTitle}>Заказы и оплаты</h1>
      <p className={styles.pageSubtitle}>Ручное управление статусами заказов</p>

      <form method="get" className={styles.filters}>
        <input
          type="search"
          name="search"
          defaultValue={search}
          placeholder="Поиск по получателю или email"
          className={styles.searchInput}
        />
        <select name="status" defaultValue={status ?? ""} className={styles.statusSelect}>
          {orderStatusOptions.map((item) => (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          ))}
        </select>
        <button type="submit" className={styles.filterButton}>
          Применить
        </button>
      </form>

      <section className={styles.panel}>
        {orders.length === 0 ? (
          <p className={styles.emptyState}>Заказы не найдены.</p>
        ) : (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Открытка</th>
                  <th>Сумма</th>
                  <th>Статус</th>
                  <th>Создан</th>
                  <th>Действия</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => (
                  <tr key={order.id}>
                    <td>
                      <Link href={`/admin/orders/${order.id}`}>{order.recipientName}</Link>
                      <br />
                      <span style={{ color: "var(--a-muted)", fontSize: 13 }}>{order.organizerEmail}</span>
                    </td>
                    <td>
                      {order.amount} {order.currency}
                    </td>
                    <td>
                      <span className={`${styles.badge} ${statusBadgeClass[order.status] ?? ""}`}>
                        {statusLabels[order.status] ?? order.status}
                      </span>
                    </td>
                    <td>{new Date(order.createdAt).toLocaleDateString("ru-RU")}</td>
                    <td>—</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}
