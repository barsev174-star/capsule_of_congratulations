import Link from "next/link";
import { notFound } from "next/navigation";
import { getPaymentOrderById } from "@/lib/admin/repository-phase2";
import { requireAdminRole } from "@/lib/admin/session";
import { grantRepurchaseAction, requestRobokassaRefundAction, revokePaymentOrderAction } from "../../../actions-phase2";
import styles from "../../../admin.module.css";

const statusLabels: Record<string, string> = {
  CREATED: "Ожидает оплаты",
  PAID: "Оплачен",
  PARTIALLY_REFUNDED: "Частичный возврат",
  REFUNDED: "Возврат",
  CANCELED: "Отменён",
  REVOKED: "Отозван"
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

        <div className={styles.detailGrid} style={{ marginTop: 20 }}>
          <form action={revokePaymentOrderAction} className={styles.filters}>
            <input type="hidden" name="orderId" value={order.id} />
            <select name="reason" defaultValue="OTHER" className={styles.statusSelect}>
              <option value="CHARGEBACK">Chargeback</option>
              <option value="PROVIDER_REVERSAL">Provider reversal</option>
              <option value="FRAUD">Fraud</option>
              <option value="ERRONEOUS_ENTITLEMENT">Erroneous entitlement</option>
              <option value="OTHER">Other</option>
            </select>
            <input name="comment" required placeholder="Причина отзыва" className={styles.searchInput} />
            <button type="submit" className={styles.actionButton}>Отозвать доступ</button>
          </form>
          <form action={grantRepurchaseAction} className={styles.filters}>
            <input type="hidden" name="cardId" value={order.cardId} />
            <button type="submit" className={styles.actionButton}>Разрешить повторную покупку на 30 дней</button>
          </form>
          <form action={requestRobokassaRefundAction} className={styles.filters}>
            <input type="hidden" name="orderId" value={order.id} />
            <input name="reason" required placeholder="Причина возврата" className={styles.searchInput} />
            <button type="submit" className={styles.actionButton}>Запросить полный возврат</button>
          </form>
        </div>

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
