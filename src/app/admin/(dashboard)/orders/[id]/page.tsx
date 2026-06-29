import Link from "next/link";
import { notFound } from "next/navigation";
import { getPaymentOrderById } from "@/lib/admin/repository-phase2";
import { requireAdminRole } from "@/lib/admin/session";
import { updatePaymentOrderStatusAction } from "../../../actions-phase2";
import styles from "../../../admin.module.css";

const statusLabels: Record<string, string> = {
  pending: "Ожидает оплаты",
  paid: "Оплачен",
  failed: "Ошибка",
  refunded: "Возврат"
};

type Props = {
  params: Promise<{
    id: string;
  }>;
};

export default async function AdminOrderDetailPage({ params }: Props) {
  await requireAdminRole("admin");
  const { id } = await params;
  const order = await getPaymentOrderById(id);

  if (!order) {
    notFound();
  }

  return (
    <>
      <h1 className={styles.pageTitle}>Заказ #{order.id.slice(0, 8)}</h1>
      <p className={styles.pageSubtitle}>Детали заказа</p>

      <section className={styles.panel} style={{ marginBottom: 24 }}>
        <div className={styles.detailGrid}>
          <div className={styles.detailField}>
            <span>Получатель</span>
            <strong>{order.recipientName}</strong>
          </div>
          <div className={styles.detailField}>
            <span>Сумма</span>
            <strong>
              {order.amount} {order.currency}
            </strong>
          </div>
          <div className={styles.detailField}>
            <span>Статус</span>
            <strong>{statusLabels[order.status] ?? order.status}</strong>
          </div>
          <div className={styles.detailField}>
            <span>Провайдер</span>
            <strong>{order.provider ?? "—"}</strong>
          </div>
          <div className={styles.detailField}>
            <span>Создан</span>
            <strong>{new Date(order.createdAt).toLocaleString("ru-RU")}</strong>
          </div>
          <div className={styles.detailField}>
            <span>Обновлён</span>
            <strong>{new Date(order.updatedAt).toLocaleString("ru-RU")}</strong>
          </div>
        </div>

        <form action={updatePaymentOrderStatusAction} className={styles.filters}>
          <input type="hidden" name="orderId" value={order.id} />
          <select name="status" defaultValue={order.status} className={styles.statusSelect}>
            {Object.entries(statusLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          <button type="submit" className={styles.filterButton}>
            Сменить статус
          </button>
        </form>

        <div className={styles.detailLinks}>
          <Link href={`/admin/cards/${order.cardId}`} className={styles.detailLink}>
            Открытка
          </Link>
          <Link href="/admin/orders" className={styles.detailLink}>
            К списку заказов
          </Link>
        </div>
      </section>
    </>
  );
}
