import Link from "next/link";
import { getAdminDashboardStats } from "@/lib/admin/repository";
import { requireAdminRole } from "@/lib/admin/session";
import { getCardLifecycleLabel } from "@/lib/cards/lifecycle";
import styles from "../admin.module.css";

const paymentStatusLabels: Record<string, string> = {
  UNPAID: "Не оплачены",
  PAID: "Оплачены",
  REFUNDED: "Возвращены",
  REVOKED: "Отозваны"
};

const collectionStatusLabels: Record<string, string> = {
  DRAFT: "Черновики",
  OPEN: "Сбор открыт",
  CLOSED: "Сбор закрыт"
};

const deliveryStatusLabels: Record<string, string> = {
  PREPARING: "Готовятся",
  DELIVERED: "Переданы"
};

export default async function AdminDashboardPage() {
  await requireAdminRole("support");
  const stats = await getAdminDashboardStats();

  return (
    <>
      <h1 className={styles.pageTitle}>Dashboard</h1>
      <p className={styles.pageSubtitle}>Общая сводка по открыткам и поздравлениям</p>

      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <p className={styles.statValue}>{stats.totalCards}</p>
          <p className={styles.statLabel}>Всего открыток</p>
          <div className={styles.statusBreakdown}>
            {Object.entries(stats.cardsByPaymentStatus).map(([status, count]) => (
              <span key={status} className={styles.statusChip}>
                {paymentStatusLabels[status] ?? status}: {count}
              </span>
            ))}
            {Object.entries(stats.cardsByCollectionStatus).map(([status, count]) => (
              <span key={status} className={styles.statusChip}>
                {collectionStatusLabels[status] ?? status}: {count}
              </span>
            ))}
            {Object.entries(stats.cardsByDeliveryStatus).map(([status, count]) => (
              <span key={status} className={styles.statusChip}>
                {deliveryStatusLabels[status] ?? status}: {count}
              </span>
            ))}
          </div>
        </div>

        <div className={styles.statCard}>
          <p className={styles.statValue}>{stats.totalContributions}</p>
          <p className={styles.statLabel}>Всего поздравлений</p>
          <div className={styles.statusBreakdown}>
            <span className={styles.statusChip}>видны: {stats.visibleContributions}</span>
            <span className={styles.statusChip}>скрыты: {stats.hiddenContributions}</span>
            <span className={styles.statusChip}>удалены: {stats.deletedContributions}</span>
          </div>
        </div>

        <div className={styles.statCard}>
          <p className={styles.statValue}>{stats.totalMediaAssets}</p>
          <p className={styles.statLabel}>Загружено фото</p>
        </div>
      </div>

      <section className={styles.panel}>
        <h2 className={styles.panelTitle}>Последние открытки</h2>
        {stats.recentCards.length === 0 ? (
          <p className={styles.emptyState}>Пока нет ни одной открытки.</p>
        ) : (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Получатель</th>
                  <th>Email организатора</th>
                  <th>Статус</th>
                  <th>Создана</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {stats.recentCards.map((card) => (
                  <tr key={card.id}>
                    <td>{card.recipientName}</td>
                    <td>{card.organizerEmail}</td>
                    <td>
                      <span className={styles.badge}>
                        {getCardLifecycleLabel({
                          paymentStatus: card.paymentStatus,
                          collectionStatus: card.collectionStatus ?? "DRAFT",
                          deliveryStatus: card.deliveryStatus ?? "PREPARING"
                        })}
                      </span>
                    </td>
                    <td>{new Date(card.createdAt).toLocaleDateString("ru-RU")}</td>
                    <td>
                      <Link href={`/admin/cards/${card.id}`}>Открыть</Link>
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
