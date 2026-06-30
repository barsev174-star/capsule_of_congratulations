import Link from "next/link";
import { notFound } from "next/navigation";
import { getAdminCardById } from "@/lib/admin/repository";
import { getAiUsageSummary } from "@/lib/ai/repository";
import { updateAiBonusLimitAdminAction, updateCardStatusAdminAction } from "../../../actions";
import styles from "../../../admin.module.css";

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

const contributionStatusLabels: Record<string, string> = {
  visible: "Видно",
  hidden: "Скрыто",
  deleted: "Удалено"
};

type Props = {
  params: Promise<{
    id: string;
  }>;
};

export default async function AdminCardDetailPage({ params }: Props) {
  const { id } = await params;
  const detail = await getAdminCardById(id);

  if (!detail) {
    notFound();
  }

  const { card, contributions, mediaAssets } = detail;
  const aiUsage = await getAiUsageSummary(card.id);

  return (
    <>
      <h1 className={styles.pageTitle}>{card.recipientName}</h1>
      <p className={styles.pageSubtitle}>Детали открытки</p>

      <section className={styles.panel} style={{ marginBottom: 24 }}>
        <div className={styles.detailGrid}>
          <div className={styles.detailField}>
            <span>Получатель</span>
            <strong>{card.recipientName}</strong>
          </div>
          <div className={styles.detailField}>
            <span>Повод</span>
            <strong>{card.occasionText}</strong>
          </div>
          <div className={styles.detailField}>
            <span>Организатор</span>
            <strong>
              {card.organizerName} ({card.organizerEmail})
            </strong>
          </div>
          <div className={styles.detailField}>
            <span>Шаблон</span>
            <strong>{card.templateId}</strong>
          </div>
          <div className={styles.detailField}>
            <span>Статус</span>
            <span className={`${styles.badge} ${statusBadgeClass[card.status] ?? ""}`}>
              {statusLabels[card.status] ?? card.status}
            </span>
          </div>
          <div className={styles.detailField}>
            <span>Создана</span>
            <strong>{new Date(card.createdAt).toLocaleString("ru-RU")}</strong>
          </div>
        </div>

        <form action={updateCardStatusAdminAction} className={styles.filters}>
          <input type="hidden" name="cardId" value={card.id} />
          <select name="status" defaultValue={card.status} className={styles.statusSelect}>
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
          <Link href={`/manage/${card.manageToken}`} className={styles.detailLink}>
            Страница организатора
          </Link>
          <Link href={`/gift/${card.finalSlug}`} className={styles.detailLink}>
            Финальная открытка
          </Link>
          <Link href={`/preview/${card.manageToken}`} className={styles.detailLink}>
            Предпросмотр
          </Link>
        </div>
      </section>

      <section className={styles.panel} style={{ marginBottom: 24 }}>
        <div className={styles.aiLimitHeader}>
          <div>
            <h2 className={styles.panelTitle}>AI-лимит</h2>
            <p>Базовый лимит: {aiUsage.baseLimit}. Использовано: {aiUsage.used}. Осталось: {aiUsage.remaining}.</p>
          </div>
          <span className={styles.aiLimitValue}>{aiUsage.limit}</span>
        </div>
        <form action={updateAiBonusLimitAdminAction} className={styles.aiLimitForm}>
          <input type="hidden" name="cardId" value={card.id} />
          <label className={styles.aiLimitField}>
            <span>Дополнительные генерации</span>
            <input name="bonusLimit" type="number" min="0" max="1000" step="1" defaultValue={aiUsage.bonusLimit} />
          </label>
          <button type="submit" className={styles.filterButton}>Сохранить лимит</button>
        </form>
      </section>

      <section className={styles.panel} style={{ marginBottom: 24 }}>
        <h2 className={styles.panelTitle}>Поздравления ({contributions.length})</h2>
        {contributions.length === 0 ? (
          <p className={styles.emptyState}>Пока нет поздравлений.</p>
        ) : (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Автор</th>
                  <th>Текст</th>
                  <th>Статус</th>
                  <th>Дата</th>
                </tr>
              </thead>
              <tbody>
                {contributions.map((contribution) => (
                  <tr key={contribution.id}>
                    <td>{contribution.authorName}</td>
                    <td style={{ maxWidth: 400, whiteSpace: "pre-wrap" }}>{contribution.message}</td>
                    <td>{contributionStatusLabels[contribution.status] ?? contribution.status}</td>
                    <td>{new Date(contribution.createdAt).toLocaleDateString("ru-RU")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className={styles.panel}>
        <h2 className={styles.panelTitle}>Фото ({mediaAssets.length})</h2>
        {mediaAssets.length === 0 ? (
          <p className={styles.emptyState}>Нет загруженных фото.</p>
        ) : (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Слот</th>
                  <th>Файл</th>
                  <th>Подпись</th>
                  <th>Размер</th>
                </tr>
              </thead>
              <tbody>
                {mediaAssets.map((asset) => (
                  <tr key={asset.id}>
                    <td>{asset.slot}</td>
                    <td>
                      <Link href={asset.publicUrl} target="_blank">
                        {asset.fileName}
                      </Link>
                    </td>
                    <td>
                      {asset.captionTitle}
                      {asset.captionSubtitle ? <br /> : null}
                      <span style={{ color: "var(--a-muted)", fontSize: 13 }}>{asset.captionSubtitle}</span>
                    </td>
                    <td>{(asset.sizeBytes / 1024).toFixed(1)} KB</td>
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
