import Link from "next/link";
import { listAdminContributions } from "@/lib/admin/repository";
import type { ContributionStatus } from "@/lib/cards/types";
import { requireAdminRole } from "@/lib/admin/session";
import { updateContributionStatusAdminAction } from "../../actions";
import styles from "../../admin.module.css";

const contributionStatusOptions = [
  { value: "", label: "Все статусы" },
  { value: "visible", label: "Видны" },
  { value: "hidden", label: "Скрыты" },
  { value: "deleted", label: "Удалены" }
] as const;

const contributionStatuses: ContributionStatus[] = ["visible", "hidden", "deleted"];
const isContributionStatus = (value: string): value is ContributionStatus =>
  contributionStatuses.includes(value as ContributionStatus);

const statusLabels: Record<string, string> = {
  visible: "Видно",
  hidden: "Скрыто",
  deleted: "Удалено"
};

const statusBadgeClass: Record<string, string> = {
  visible: styles.badgeVisible,
  hidden: styles.badgeHidden,
  deleted: styles.badgeDeleted
};

type Props = {
  searchParams: Promise<{
    status?: string;
    search?: string;
  }>;
};

export default async function AdminContributionsPage({ searchParams }: Props) {
  await requireAdminRole("support");
  const { status, search } = await searchParams;
  const statusValue = status && isContributionStatus(status) ? status : undefined;
  const contributions = await listAdminContributions({
    status: statusValue,
    search: search?.trim() || undefined,
    limit: 50
  });

  return (
    <>
      <h1 className={styles.pageTitle}>Поздравления</h1>
      <p className={styles.pageSubtitle}>Модерация поздравлений</p>

      <form method="get" className={styles.filters}>
        <input
          type="search"
          name="search"
          defaultValue={search}
          placeholder="Поиск по автору или тексту"
          className={styles.searchInput}
        />
        <select name="status" defaultValue={status ?? ""} className={styles.statusSelect}>
          {contributionStatusOptions.map((item) => (
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
        {contributions.length === 0 ? (
          <p className={styles.emptyState}>Поздравления не найдены.</p>
        ) : (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Автор</th>
                  <th>Текст</th>
                  <th>Открытка</th>
                  <th>Статус</th>
                  <th>Дата</th>
                  <th>Действия</th>
                </tr>
              </thead>
              <tbody>
                {contributions.map((contribution) => (
                  <tr key={contribution.id}>
                    <td>{contribution.authorName}</td>
                    <td style={{ maxWidth: 360, whiteSpace: "pre-wrap" }}>{contribution.message}</td>
                    <td>
                      <Link href={`/admin/cards/${contribution.cardId}`}>{contribution.recipientName}</Link>
                      <br />
                      <Link href={`/join/${contribution.publicSlug}`} style={{ fontSize: 13 }}>
                        Ссылка участника
                      </Link>
                    </td>
                    <td>
                      <span className={`${styles.badge} ${statusBadgeClass[contribution.status] ?? ""}`}>
                        {statusLabels[contribution.status] ?? contribution.status}
                      </span>
                    </td>
                    <td>{new Date(contribution.createdAt).toLocaleDateString("ru-RU")}</td>
                    <td>
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                        {contribution.status !== "visible" && (
                          <form action={updateContributionStatusAdminAction} className={styles.actionForm}>
                            <input type="hidden" name="contributionId" value={contribution.id} />
                            <input type="hidden" name="status" value="visible" />
                            <button type="submit" className={`${styles.actionButton} ${styles.actionButtonPrimary}`}>
                              Показать
                            </button>
                          </form>
                        )}
                        {contribution.status !== "hidden" && (
                          <form action={updateContributionStatusAdminAction} className={styles.actionForm}>
                            <input type="hidden" name="contributionId" value={contribution.id} />
                            <input type="hidden" name="status" value="hidden" />
                            <button type="submit" className={styles.actionButton}>Скрыть</button>
                          </form>
                        )}
                        {contribution.status !== "deleted" && (
                          <form action={updateContributionStatusAdminAction} className={styles.actionForm}>
                            <input type="hidden" name="contributionId" value={contribution.id} />
                            <input type="hidden" name="status" value="deleted" />
                            <button type="submit" className={`${styles.actionButton} ${styles.actionButtonDanger}`}>
                              Удалить
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
