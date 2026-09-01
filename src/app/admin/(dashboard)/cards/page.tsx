import Link from "next/link";
import { listAdminCards } from "@/lib/admin/repository";
import { requireAdminRole } from "@/lib/admin/session";
import { getCardLifecycleLabel } from "@/lib/cards/lifecycle";
import { getManagePath, getPreviewPath } from "@/lib/routes/card-links";
import styles from "../../admin.module.css";

type Props = {
  searchParams: Promise<{
    search?: string;
  }>;
};

const valueOrFallback = (value: string | null | undefined, fallback: string) => value?.trim() || fallback;

const formatCreatedAt = (value: string) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Дата не указана" : date.toLocaleDateString("ru-RU");
};

export default async function AdminCardsPage({ searchParams }: Props) {
  await requireAdminRole("moderator");
  const { search } = await searchParams;
  const cards = await listAdminCards({
    search: search?.trim() || undefined,
    limit: 50
  });

  return (
    <>
      <h1 className={styles.pageTitle}>Открытки</h1>
      <p className={styles.pageSubtitle}>Управление открытками и их статусами</p>

      <form method="get" className={styles.filters}>
        <input
          type="search"
          name="search"
          defaultValue={search}
          placeholder="Поиск по получателю, организатору, email"
          className={styles.searchInput}
        />
        <button type="submit" className={styles.filterButton}>
          Применить
        </button>
      </form>

      <section className={styles.panel}>
        {cards.length === 0 ? (
          <p className={styles.emptyState}>Открытки не найдены.</p>
        ) : (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Получатель</th>
                  <th>Повод</th>
                  <th>Организатор</th>
                  <th>Статус</th>
                  <th>Создана</th>
                  <th>Действия</th>
                </tr>
              </thead>
              <tbody>
                {cards.map((card) => (
                  <tr key={card.id}>
                    <td>
                      <Link href={`/admin/cards/${card.id}`} className={styles.cardPrimaryLink}>
                        {valueOrFallback(card.recipientName, "Получатель не указан")}
                      </Link>
                      <span className={styles.cardId} title={card.id}>ID: {card.id.slice(0, 8)}</span>
                    </td>
                    <td>{valueOrFallback(card.occasionText, "Повод не указан")}</td>
                    <td className={styles.organizerCell}>
                      <span>{valueOrFallback(card.organizerName, "Организатор не указан")}</span>
                      <span className={styles.cellSecondary}>{valueOrFallback(card.organizerEmail, "Email не указан")}</span>
                    </td>
                    <td>
                      <span className={`${styles.badge} ${card.deletedAt ? styles.badgeDeleted : ""}`.trim()}>
                        {card.deletedAt
                          ? "Удалена"
                          : getCardLifecycleLabel({
                              paymentStatus: card.paymentStatus,
                              collectionStatus: card.collectionStatus ?? "DRAFT",
                              deliveryStatus: card.deliveryStatus ?? "PREPARING"
                            })}
                      </span>
                    </td>
                    <td className={styles.dateCell}>{formatCreatedAt(card.createdAt)}</td>
                    <td>
                      <div className={styles.cardActions}>
                        <Link href={`/admin/cards/${card.id}`} className={`${styles.detailLink} ${styles.detailLinkPrimary}`.trim()}>
                          Детали и доступ
                        </Link>
                        {!card.deletedAt ? (
                          <>
                          <Link href={getManagePath(card.id)} className={styles.detailLink}>
                            Управлять
                          </Link>
                          <Link href={getPreviewPath(card.id)} className={styles.detailLink}>
                            Предпросмотр
                          </Link>
                          </>
                        ) : (
                          <span className={styles.emptyValue}>Пользовательские действия недоступны</span>
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
