import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdminRole } from "@/lib/admin/session";
import { getAdminReminder, getReminderErrorHistory } from "@/lib/admin/reminders";
import { formatAdminDate } from "@/lib/admin/format";
import { AdminDetailPanel, AdminPageHeader, AdminStatusBadge } from "../../../components/admin-ui";
import { AdminStatus } from "../../../components/admin-status";
import { AdminConfirmDialog } from "../../../components/admin-confirm-dialog";
import { cancelAdminReminderAction } from "../../../actions-reminders";
import styles from "../../../admin.module.css";
export default async function AdminReminderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdminRole("admin");
  const { id } = await params;
  const reminder = await getAdminReminder(id);
  if (!reminder) notFound();
  const history = await getReminderErrorHistory(id);
  const information = [["ID",reminder.id],["Email",reminder.email],["Получатель",reminder.recipientName],["Событие",reminder.occasionText],["Дата события",formatAdminDate(reminder.eventDate)],["Дата заявки",formatAdminDate(reminder.createdAt,true)],["Источник","Страница участника /join"]];
  return <>
    <AdminPageHeader title={reminder.occasionText} description="Подробности заявки на напоминание"><Link href="/admin/reminders" className={styles.detailLink}>К списку</Link></AdminPageHeader>
    <AdminDetailPanel title="Информация"><div className={styles.detailGrid}>{information.map(([label,value]) => <div className={styles.detailField} key={label}><span>{label}</span><strong>{value}</strong></div>)}</div><div className={styles.detailLinks}>{reminder.sourceCardId ? <Link href={`/admin/cards/${reminder.sourceCardId}`} className={styles.detailLink}>Исходная открытка</Link> : <span>Связь с исходной открыткой не сохранена.</span>}</div></AdminDetailPanel>
    <AdminDetailPanel title="Напоминание"><div className={styles.detailGrid}>
      <div className={styles.detailField}><span>Заявка</span><AdminStatusBadge>{reminder.status === "cancelled" ? "Отменена" : "Получена"}</AdminStatusBadge></div>
      <div className={styles.detailField}><span>Отправка</span>{reminder.schedule === "confirmation_only" ? <AdminStatusBadge>Не запланирована</AdminStatusBadge> : <AdminStatus domain="reminder" value={reminder.status} />}</div>
      <div className={styles.detailField}><span>Запланированная дата</span><strong>{reminder.remindOn ? formatAdminDate(reminder.remindOn) : "Без отдельной отправки"}</strong></div>
      <div className={styles.detailField}><span>Передано почтовому сервису</span><strong>{formatAdminDate(reminder.sentAt,true)}</strong></div>
      <div className={styles.detailField}><span>Попытки отправки</span><strong>{reminder.attemptCount}</strong></div>
      <div className={styles.detailField}><span>Последняя ошибка</span><strong>{history[0] ? `Ошибка отправки · ${formatAdminDate(history[0].date,true)}` : "Нет сохранённых сведений"}</strong></div>
    </div><p className={styles.analyticsNote}>«Отправлено» означает передачу письма почтовому сервису. Доставка получателю не отслеживается. Подтверждение владения email не предусмотрено текущим сценарием.</p>
    {reminder.remindOn && ["pending","failed"].includes(reminder.status) && <form action={cancelAdminReminderAction}><input type="hidden" name="reminderId" value={id} /><AdminConfirmDialog message="Отменить предстоящую отправку напоминания?">Отменить отправку</AdminConfirmDialog></form>}
    {reminder.status === "failed" && <p className={styles.analyticsNote}>Ручной повтор не предусмотрен текущим механизмом. Почтовый транспорт не гарантирует защиту от повторной доставки после неопределённого результата отправки.</p>}
    </AdminDetailPanel>
    <AdminDetailPanel title="Связанная новая открытка"><p className={styles.analyticsNote}>Связь не отслеживается. Исходная открытка не считается результатом напоминания; совпадение email не подтверждает создание новой.</p></AdminDetailPanel>
    <details className={`${styles.panel} ${styles.disclosure}`}><summary>Технические сведения</summary><div><p>Версия согласия: {reminder.consentVersion ?? "Нет данных"}</p><p>Согласие: {formatAdminDate(reminder.consentAcceptedAt,true)}</p><p>Письмо о сохранении заявки: {formatAdminDate(reminder.confirmationSentAt,true)}</p><p>Сценарий: {reminder.schedule}</p><p>Полная история попыток не хранится. Счётчик попыток: {reminder.attemptCount}.</p>{history.map((event) => <p key={event.id}>Ошибка отправки · {formatAdminDate(event.date,true)} · ID: {event.errorId ?? event.id}</p>)}</div></details>
  </>;
}
