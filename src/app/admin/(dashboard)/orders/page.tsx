import Link from "next/link";
import { listPaymentOrders } from "@/lib/admin/repository-phase2";
import type { PaymentOrderStatus } from "@/lib/admin/types";
import { updatePaymentOrderStatusAction } from "../../actions-phase2";
import { requireAdminRole } from "@/lib/admin/session";
import styles from "../../admin.module.css";

const orderStatusOptions = [
  { value: "", label: "Все статусы" },
  { value: "pending", label: "Ожидает оплаты" },
  { value: "paid", label: "Оплачен" },
  { value: "failed", label: "Ошибка" },
  { value: "refunded", label: "Возврат" }
] as const;

const orderStatuses: PaymentOrderStatus[] = ["pending", "paid", "failed", "refunded"];
const isPaymentOrderStatus = (value: string): value is PaymentOrderStatus =>
  orderStatuses.includes(value as PaymentOrderStatus);

const statusLabels: Record<string, string> = {
  pending: "Ожидает оплаты",
  paid: "Оплачен",
  failed: "Ошибка",
  refunded: "Возврат"
};

const statusBadgeClass: Record<string, string> = {
  pending: styles.badgeDraft,
  paid: styles.badgeReady,
  failed: styles.badgeDeleted,
  refunded: styles.badgeHidden
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
                    <td>
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                        {order.status !== "paid" && (
                          <form action={updatePaymentOrderStatusAction} className={styles.actionForm}>
                            <input type="hidden" name="orderId" value={order.id} />
                            <input type="hidden" name="status" value="paid" />
                            <button type="submit" className={`${styles.actionButton} ${styles.actionButtonPrimary}`}>
                              Оплачен
                            </button>
                          </form>
                        )}
                        {order.status !== "failed" && (
                          <form action={updatePaymentOrderStatusAction} className={styles.actionForm}>
                            <input type="hidden" name="orderId" value={order.id} />
                            <input type="hidden" name="status" value="failed" />
                            <button type="submit" className={styles.actionButton}>Ошибка</button>
                          </form>
                        )}
                        {order.status !== "refunded" && (
                          <form action={updatePaymentOrderStatusAction} className={styles.actionForm}>
                            <input type="hidden" name="orderId" value={order.id} />
                            <input type="hidden" name="status" value="refunded" />
                            <button type="submit" className={`${styles.actionButton} ${styles.actionButtonDanger}`}>
                              Возврат
                            </button>
                          </form>
                        )}
                      </div>
                    </td>
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
