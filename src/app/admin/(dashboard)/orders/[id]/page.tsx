import Link from "next/link";
import { notFound } from "next/navigation";
import { getPaymentOrderById } from "@/lib/admin/repository-phase2";
import { requireAdminRole } from "@/lib/admin/session";
import { grantRepurchaseAction, requestRobokassaRefundAction, revokePaymentOrderAction, syncRobokassaRefundAction } from "../../../actions-phase2";
import { getAdminOrderFinance } from "@/lib/admin/finances";
import { formatAdminDate, formatMoney } from "@/lib/admin/format";
import { AdminStatus } from "../../../components/admin-status";
import { AdminConfirmDialog } from "../../../components/admin-confirm-dialog";
import { AdminDataTable, AdminDetailPanel } from "../../../components/admin-ui";
import styles from "../../../admin.module.css";

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
  const finance = await getAdminOrderFinance(order.id);

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
              {formatMoney(order.amount, order.currency)}
            </strong>
          </div>
          <div className={styles.detailField}>
            <span>Статус</span>
            <AdminStatus domain="order" value={order.status} />
          </div>
          <div className={styles.detailField}>
            <span>Провайдер</span>
            <strong>{order.provider ?? "—"}</strong>
          </div>
          <div className={styles.detailField}>
            <span>Создан</span>
            <strong>{formatAdminDate(order.createdAt, true)}</strong>
          </div>
          <div className={styles.detailField}>
            <span>Обновлён</span>
            <strong>{formatAdminDate(order.updatedAt, true)}</strong>
          </div>
        </div>

        <div className={styles.detailGrid} style={{ marginTop: 20 }}>
          {["PAID","PARTIALLY_REFUNDED"].includes(order.status) && <form action={revokePaymentOrderAction} className={styles.filters}>
            <input type="hidden" name="orderId" value={order.id} />
            <select name="reason" defaultValue="OTHER" className={styles.statusSelect}>
              <option value="CHARGEBACK">Chargeback</option>
              <option value="PROVIDER_REVERSAL">Provider reversal</option>
              <option value="FRAUD">Fraud</option>
              <option value="ERRONEOUS_ENTITLEMENT">Erroneous entitlement</option>
              <option value="OTHER">Other</option>
            </select>
            <input name="comment" required placeholder="Причина отзыва" className={styles.searchInput} />
            <AdminConfirmDialog message="Отозвать оплаченный доступ? Это действие не возвращает деньги.">Отозвать доступ</AdminConfirmDialog>
          </form>}
          {["REFUNDED","REVOKED"].includes(order.status) && <form action={grantRepurchaseAction} className={styles.filters}>
            <input type="hidden" name="cardId" value={order.cardId} />
            <AdminConfirmDialog danger={false} message="Разрешить повторную покупку этой открытки на 30 дней?">Разрешить повторную покупку на 30 дней</AdminConfirmDialog>
          </form>}
          {order.status === "PAID" && !finance.refundRequested && <form action={requestRobokassaRefundAction} className={styles.filters}>
            <input type="hidden" name="orderId" value={order.id} />
            <input name="reason" required placeholder="Причина возврата" className={styles.searchInput} />
            <AdminConfirmDialog message={`Запросить полный возврат ${formatMoney(order.amount, order.currency)}?`}>Запросить полный возврат</AdminConfirmDialog>
          </form>}
          {finance.refundRequested && <p className={styles.analyticsNote}>Запрос возврата уже зарегистрирован. Повторный запрос заблокирован. Если результат неизвестен, проверьте состояние операции у провайдера.</p>}
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
      <AdminDetailPanel title="Платёжные попытки"><AdminDataTable rows={finance.attempts} label="Попытки оплаты заказа" columns={[
        { key:"id",label:"Попытка",render:(a) => <Link href={`/admin/payments/${a.id}`}>#{a.id.slice(0,8)}</Link> },
        { key:"status",label:"Статус",render:(a) => <AdminStatus domain="attempt" value={a.status} /> },
        { key:"amount",label:"Сумма",render:(a) => formatMoney(a.amount,a.currency) },
        { key:"date",label:"Дата",render:(a) => formatAdminDate(a.createdAt,true) }
      ]} /><Link href={`/admin/payments?order=${order.id}`} className={styles.detailLink}>Все попытки с пагинацией</Link></AdminDetailPanel>
      <AdminDetailPanel title="Возвраты"><AdminDataTable rows={finance.refunds} label="Возвраты заказа" columns={[
        { key:"id",label:"ID",render:(r) => r.providerRefundId ?? r.id },
        { key:"status",label:"Статус",render:(r) => <AdminStatus domain="refund" value={r.status} /> },
        { key:"amount",label:"Сумма",render:(r) => formatMoney(r.amount,order.currency) },
        { key:"date",label:"Завершён",render:(r) => formatAdminDate(r.completedAt,true) },
        { key:"sync",label:"Действие",render:(r) => r.providerRefundId && r.status !== "SUCCEEDED" ? <form action={syncRobokassaRefundAction}><input type="hidden" name="requestId" value={r.providerRefundId} /><AdminConfirmDialog danger={false} message="Проверить состояние возврата у Robokassa и обновить заказ?">Обновить состояние</AdminConfirmDialog></form> : "—" }
      ]} empty="Возвратов нет." /></AdminDetailPanel>
    </>
  );
}
