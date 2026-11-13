import Link from "next/link";
import { notFound } from "next/navigation";
import { getAdminCardById } from "@/lib/admin/repository";
import { getAiUsageSummary } from "@/lib/ai/repository";
import { grantCardAccessAdminAction, revokeCardAccessAdminAction, updateAiBonusLimitAdminAction, setCardTestFlagAction } from "../../../actions";
import { AdminStatus } from "../../../components/admin-status";
import { AdminDetailPanel, AdminPageHeader, AdminStatusBadge } from "../../../components/admin-ui";
import { AdminConfirmDialog } from "../../../components/admin-confirm-dialog";
import { formatAdminDate } from "@/lib/admin/format";
import { getAdminCardAuditHistory } from "@/lib/admin/audit";
import { getActiveCardAccessGrant } from "@/lib/cards/access-grants";
import { requireAdminRole } from "@/lib/admin/session";
import styles from "../../../admin.module.css";

type Props = {
  params: Promise<{
    id: string;
  }>;
};

export default async function AdminCardDetailPage({ params }: Props) {
  const session = await requireAdminRole("moderator");
  const { id } = await params;
  const detail = await getAdminCardById(id);

  if (!detail) {
    notFound();
  }

  const { card, contributions, mediaAssets } = detail;
  const [aiUsage, activeGrant, audit] = await Promise.all([getAiUsageSummary(card.id), getActiveCardAccessGrant(card.id), getAdminCardAuditHistory(card.id)]);
  const auditLabels: Record<string, string> = { test_marked: "Помечена как тестовая", test_unmarked: "Снята тестовая пометка", payment_paid: "Подтверждена оплата", payment_refunded: "Завершён возврат", payment_revoked: "Оплаченный доступ отозван", repurchase_granted: "Разрешена повторная покупка", CARD_ACCESS_GRANTED: "Предоставлен административный доступ", CARD_ACCESS_REVOKED: "Административный доступ отозван" };

  return (
    <>
      <AdminPageHeader title={card.recipientName?.trim() || "Получатель не указан"} description={`Открытка · ${card.id}`}><Link href="/admin/cards" className={styles.detailLink}>К списку</Link></AdminPageHeader>

      <section className={styles.panel} style={{ marginBottom: 24 }}>
        <div className={styles.detailGrid}>
          <div className={styles.detailField}>
            <span>Получатель</span>
            <strong>{card.recipientName?.trim() || "Получатель не указан"}</strong>
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
            <strong>{card.templateId ?? "Не выбран"}{card.templateTheme ? ` · ${card.templateTheme}` : ""}</strong>
          </div>
          <div className={styles.detailField}>
            <span>Сбор</span><AdminStatus domain="collection" value={card.collectionStatus ?? "DRAFT"} />
          </div>
          <div className={styles.detailField}><span>Оплата</span><AdminStatus domain="payment" value={card.paymentStatus} /></div>
          <div className={styles.detailField}><span>Вручение</span><AdminStatus domain="delivery" value={card.deliveryStatus ?? "PREPARING"} /></div>
          <div className={styles.detailField}><span>Поздравления / фотографии</span><strong>{contributions.length} / {mediaAssets.length}</strong></div>
          <div className={styles.detailField}><span>Изменена</span><strong>{formatAdminDate(card.updatedAt, true)}</strong>
          </div>
          <div className={styles.detailField}>
            <span>Создана</span>
            <strong>{formatAdminDate(card.createdAt, true)}</strong>
          </div>
        </div>

        {!card.deletedAt && <div className={styles.detailLinks}>
          <Link href={`/manage/${card.id}`} className={styles.detailLink}>
            Страница организатора
          </Link>
          {card.paymentStatus === "PAID" && card.deliveryStatus === "DELIVERED" ? (
            <Link href={`/gift/${card.finalSlug}`} className={styles.detailLink}>
              Финальная открытка
            </Link>
          ) : null}
          <Link href={`/preview/${card.id}`} className={styles.detailLink}>
            Предпросмотр
          </Link>
        </div>}
      </section>

      <AdminDetailPanel title="История"><ul className={styles.activityList}>{[
        ["Создана", card.createdAt], ["Сбор открыт", card.collectionOpenedAt], ["Сбор закрыт", card.collectionClosedAt], ["Оплачена", card.paidAt], ["Передана", card.deliveredAt], ["Получатель открыл", card.recipientFirstOpenedAt], ["Возврат", card.refundedAt], ["Доступ отозван", card.revokedAt]
      ].filter((entry) => entry[1]).sort((a, b) => String(a[1]).localeCompare(String(b[1]))).map(([label, date]) => <li key={label}>{label}<span className={styles.cellSecondary}>{formatAdminDate(date, true)}</span></li>)}</ul><p className={styles.analyticsNote}>Показаны только сохранённые даты событий.</p></AdminDetailPanel>

      {audit.length > 0 && <details className={`${styles.panel} ${styles.disclosure} ${styles.detailPanel}`}><summary>Журнал действий с открыткой</summary><ul className={styles.activityList}>{audit.map(event => <li key={event.id}>{auditLabels[event.type] ?? event.type}<span className={styles.cellSecondary}>{formatAdminDate(event.date, true)}</span></li>)}</ul></details>}

      {session.role === "admin" && <AdminDetailPanel title="Тип данных"><AdminStatusBadge>{card.isTest ? "Тестовая открытка" : "Реальная открытка"}</AdminStatusBadge><p className={styles.analyticsNote}>Тестовые открытки исключаются из бизнес-показателей. Пометка задаётся вручную.</p><form action={setCardTestFlagAction}><input type="hidden" name="cardId" value={card.id} /><input type="hidden" name="isTest" value={String(!card.isTest)} /><AdminConfirmDialog danger={false} message={card.isTest ? "Вернуть открытку в бизнес-аналитику?" : "Пометить открытку как тестовую и исключить её из бизнес-аналитики?"}>{card.isTest ? "Считать реальной" : "Пометить как тестовую"}</AdminConfirmDialog></form></AdminDetailPanel>}

      {session.role === "admin" && <section className={styles.panel} style={{ marginBottom: 24 }}>
        <h2 className={styles.panelTitle}>Доступ к финальной открытке</h2>
        {card.paymentStatus === "PAID" ? <p>Подтверждённая оплата. Административный доступ не требуется.</p> : activeGrant ? (
          <>
            <p>Предоставлен администратором: {activeGrant.reasonCode}. {activeGrant.expiresAt ? `До ${formatAdminDate(activeGrant.expiresAt, true)}.` : "Без ограничения срока."}</p>
            <form action={revokeCardAccessAdminAction} className={styles.aiLimitForm}>
              <input type="hidden" name="cardId" value={card.id} /><input type="hidden" name="grantId" value={activeGrant.id} />
              <label className={styles.aiLimitField}><span>Комментарий к отзыву</span><input name="comment" minLength={3} maxLength={1000} required /></label>
              <AdminConfirmDialog message="Отозвать административный доступ к финальной открытке?">Отозвать доступ</AdminConfirmDialog>
            </form>
          </>
        ) : (
          <form action={grantCardAccessAdminAction} className={styles.aiLimitForm}>
            <input type="hidden" name="cardId" value={card.id} />
            <p>Действие не является оплатой и не создаёт финансовую операцию или чек.</p>
            <label className={styles.aiLimitField}><span>Причина</span><select name="reasonCode" defaultValue="QA_TEST"><option value="QA_TEST">Тестирование</option><option value="COMPLIMENTARY">Подарок</option><option value="SUPPORT_COMPENSATION">Компенсация</option><option value="PARTNER">Партнёр</option><option value="PROMOTION">Промо</option><option value="OTHER">Другое</option></select></label>
            <label className={styles.aiLimitField}><span>Комментарий</span><input name="comment" minLength={3} maxLength={1000} required /></label>
            <label className={styles.aiLimitField}><span>Срок</span><select name="duration" defaultValue="QA_30_DAYS"><option value="QA_30_DAYS">30 дней</option><option value="UNTIL_DATE">До выбранной даты</option><option value="PERMANENT">Без ограничения</option></select></label>
            <label className={styles.aiLimitField}><span>Дата окончания (если выбрана)</span><input name="expiresAt" type="datetime-local" /></label>
            <AdminConfirmDialog danger={false} message="Предоставить доступ без оплаты? Финансовая операция и чек созданы не будут.">Предоставить доступ без оплаты</AdminConfirmDialog>
          </form>
        )}
      </section>}

      {session.role === "admin" && <section className={styles.panel} style={{ marginBottom: 24 }}>
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
      </section>}

      <section className={styles.panel} style={{ marginBottom: 24 }}>
        <h2 className={styles.panelTitle}>Поздравления ({contributions.length})</h2>
        {contributions.length === 0 ? (
          <p className={styles.emptyState}>Пока нет поздравлений.</p>
        ) : (
          <div className={styles.responsiveTable}>
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
                    <td data-label="Автор">{contribution.authorName}</td>
                    <td data-label="Текст"><details className={styles.disclosure}><summary><span className={styles.textPreview}>{contribution.message}</span></summary><p style={{ whiteSpace: "pre-wrap" }}>{contribution.message}</p></details></td>
                    <td data-label="Статус"><AdminStatus domain="contribution" value={contribution.status} /></td>
                    <td data-label="Дата">{formatAdminDate(contribution.createdAt)}</td>
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
          <div className={styles.responsiveTable}>
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
                    <td data-label="Слот">{asset.slot}</td>
                    <td data-label="Файл">
                      <Link href={asset.publicUrl} target="_blank">
                        {asset.fileName}
                      </Link>
                    </td>
                    <td data-label="Подпись">
                      {asset.captionTitle}
                      {asset.captionSubtitle ? <br /> : null}
                      <span style={{ color: "var(--a-muted)", fontSize: 13 }}>{asset.captionSubtitle}</span>
                    </td>
                    <td data-label="Размер">{(asset.sizeBytes / 1024).toFixed(1)} КБ</td>
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
