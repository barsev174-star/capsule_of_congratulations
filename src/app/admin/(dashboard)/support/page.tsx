import { requireAdminRole } from "@/lib/admin/session";
import { listSupportRequests } from "@/lib/support/repository";
import { listSupportNotificationDeliveries } from "@/lib/support/notifications-repository";
import type {
  SupportNotificationChannel,
  SupportNotificationStatus,
  SupportRequestCategory,
  SupportRequestStatus
} from "@/lib/support/types";
import { retrySupportNotificationAction, updateSupportRequestStatusAction } from "../../actions-support";
import styles from "../../admin.module.css";

const statuses: SupportRequestStatus[] = ["new", "in_progress", "resolved"];
const statusLabels: Record<SupportRequestStatus, string> = {
  new: "Новое",
  in_progress: "В работе",
  resolved: "Решено"
};
const categoryLabels: Record<SupportRequestCategory, string> = {
  problem: "Проблема",
  suggestion: "Предложение",
  question: "Вопрос"
};
const notificationChannelLabels: Record<SupportNotificationChannel, string> = {
  email: "Email",
  telegram: "Telegram"
};
const notificationStatusLabels: Record<SupportNotificationStatus, string> = {
  pending: "В очереди",
  sending: "Отправляется",
  sent: "Отправлено",
  failed: "Ошибка"
};

type Props = { searchParams: Promise<{ status?: string }> };

export default async function AdminSupportPage({ searchParams }: Props) {
  await requireAdminRole("support");
  const { status } = await searchParams;
  const selectedStatus = statuses.includes(status as SupportRequestStatus)
    ? status as SupportRequestStatus
    : undefined;
  const requests = await listSupportRequests(selectedStatus);
  const deliveries = await listSupportNotificationDeliveries(requests.map((request) => request.id));
  const deliveriesByRequest = new Map(requests.map((request) => [
    request.id,
    deliveries.filter((delivery) => delivery.supportRequestId === request.id)
  ]));

  return (
    <>
      <h1 className={styles.pageTitle}>Обращения</h1>
      <p className={styles.pageSubtitle}>Проблемы, вопросы и предложения пользователей</p>

      <form method="get" className={styles.filters}>
        <select name="status" defaultValue={selectedStatus ?? ""} className={styles.statusSelect}>
          <option value="">Все статусы</option>
          {statuses.map((item) => <option key={item} value={item}>{statusLabels[item]}</option>)}
        </select>
        <button type="submit" className={styles.filterButton}>Применить</button>
      </form>

      <section className={styles.panel}>
        {requests.length === 0 ? (
          <p className={styles.emptyState}>Обращений пока нет.</p>
        ) : (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Тема</th>
                  <th>Сообщение</th>
                  <th>Контакт</th>
                  <th>Источник</th>
                  <th>Статус</th>
                  <th>Уведомления</th>
                  <th>Дата</th>
                  <th>Действия</th>
                </tr>
              </thead>
              <tbody>
                {requests.map((request) => (
                  <tr key={request.id}>
                    <td>{categoryLabels[request.category]}</td>
                    <td style={{ maxWidth: 420, whiteSpace: "pre-wrap" }}>{request.message}</td>
                    <td>
                      {request.contactName ? <>{request.contactName}<br /></> : null}
                      <a href={`mailto:${request.email}`}>{request.email}</a>
                    </td>
                    <td>{request.source}</td>
                    <td><span className={styles.badge}>{statusLabels[request.status]}</span></td>
                    <td>
                      {(deliveriesByRequest.get(request.id) ?? []).length === 0 ? (
                        <span className={styles.notificationEmpty}>Ранее не отправлялось</span>
                      ) : (
                        <div className={styles.notificationList}>
                          {(deliveriesByRequest.get(request.id) ?? []).map((delivery) => (
                            <div key={delivery.id} className={styles.notificationItem}>
                              <span>{notificationChannelLabels[delivery.channel]}</span>
                              <span className={`${styles.notificationStatus} ${
                                delivery.status === "sent"
                                  ? styles.notificationStatusSent
                                  : delivery.status === "failed"
                                    ? styles.notificationStatusFailed
                                    : ""
                              }`}>
                                {notificationStatusLabels[delivery.status]}
                              </span>
                              {delivery.status === "failed" ? (
                                <form action={retrySupportNotificationAction} className={styles.actionForm}>
                                  <input type="hidden" name="deliveryId" value={delivery.id} />
                                  <button type="submit" className={styles.notificationRetry}>Повторить</button>
                                </form>
                              ) : null}
                            </div>
                          ))}
                        </div>
                      )}
                    </td>
                    <td>{new Date(request.createdAt).toLocaleString("ru-RU")}</td>
                    <td>
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                        {request.status !== "in_progress" ? (
                          <form action={updateSupportRequestStatusAction} className={styles.actionForm}>
                            <input type="hidden" name="requestId" value={request.id} />
                            <input type="hidden" name="status" value="in_progress" />
                            <button type="submit" className={styles.actionButton}>В работу</button>
                          </form>
                        ) : null}
                        {request.status !== "resolved" ? (
                          <form action={updateSupportRequestStatusAction} className={styles.actionForm}>
                            <input type="hidden" name="requestId" value={request.id} />
                            <input type="hidden" name="status" value="resolved" />
                            <button type="submit" className={`${styles.actionButton} ${styles.actionButtonPrimary}`}>Решено</button>
                          </form>
                        ) : null}
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
