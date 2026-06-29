import Link from "next/link";
import { listAdminCards } from "@/lib/admin/repository";
import type { CardStatus } from "@/lib/cards/types";
import { requireAdminRole } from "@/lib/admin/session";
import { updateCardStatusAdminAction } from "../../actions";
import { StatusSelectForm } from "../../components/status-select-form";
import styles from "../../admin.module.css";

const cardStatusOptions = [
  { value: "", label: "Все статусы" },
  { value: "draft", label: "Черновик" },
  { value: "collecting", label: "Сбор поздравлений" },
  { value: "ready", label: "Готова к отправке" },
  { value: "closed", label: "Сбор закрыт" }
] as const;

const cardStatuses: CardStatus[] = ["draft", "collecting", "ready", "closed"];
const isCardStatus = (value: string): value is CardStatus => cardStatuses.includes(value as CardStatus);

const statusLabels: Record<string, string> = {
  draft: "Черновик",
  collecting: "Сбор поздравлений",
  ready: "Готова к отправке",
  closed: "Сбор закрыт"
};

const statusBadgeClass: Record<string, string> = {
  draft: styles.badgeDraft,
  collecting: styles.badgeCollecting,
  ready: styles.badgeReady,
  closed: styles.badgeClosed
};

type Props = {
  searchParams: Promise<{
    status?: string;
    search?: string;
  }>;
};

export default async function AdminCardsPage({ searchParams }: Props) {
  await requireAdminRole("moderator");
  const { status, search } = await searchParams;
  const statusValue = status && isCardStatus(status) ? status : undefined;
  const cards = await listAdminCards({
    status: statusValue,
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
        <select name="status" defaultValue={status ?? ""} className={styles.statusSelect}>
          {cardStatusOptions.map((item) => (
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
                      <StatusSelectForm
                        action={updateCardStatusAdminAction}
                        cardId={card.id}
                        currentStatus={card.status}
                        options={cardStatusOptions.filter((item) => item.value !== "")}
                      />
                    </td>
                    <td>{new Date(card.createdAt).toLocaleDateString("ru-RU")}</td>
                    <td>
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                        <Link href={`/manage/${card.manageToken}`} className={styles.detailLink}>
                          Управлять
                        </Link>
                        <Link href={`/gift/${card.finalSlug}`} className={styles.detailLink}>
                          Открытка
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
