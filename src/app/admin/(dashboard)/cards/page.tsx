import Link from "next/link";
import { listAdminCards } from "@/lib/admin/repository";
import { requireAdminRole } from "@/lib/admin/session";
import { getCardLifecycleLabel } from "@/lib/cards/lifecycle";
import styles from "../../admin.module.css";

type Props = {
  searchParams: Promise<{
    search?: string;
  }>;
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
                      <Link href={`/admin/cards/${card.id}`}>{card.recipientName}</Link>
                    </td>
                    <td>{card.occasionText}</td>
                    <td>
                      {card.organizerName}
                      <br />
                      <span style={{ color: "var(--a-muted)", fontSize: 13 }}>{card.organizerEmail}</span>
                    </td>
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
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                        <Link href={`/manage/${card.manageToken}`} className={styles.detailLink}>
                          Управлять
                        </Link>
                        <Link href={`/preview/${card.manageToken}`} className={styles.detailLink}>
                          Предпросмотр
                        </Link>
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
