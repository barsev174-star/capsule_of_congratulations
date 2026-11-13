import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdminRole } from "@/lib/admin/session";
import { getAdminTechnicalEvent } from "@/lib/admin/technical-events";
import { parsePeriod, formatAdminDate } from "@/lib/admin/format";
import { AdminPageHeader,AdminDetailPanel } from "../../../../components/admin-ui";
import { AdminCopyValue } from "../../../../components/admin-copy-value";
import styles from "../../../../admin.module.css";
export default async function AdminTechnicalEventPage({params,searchParams}:{params:Promise<{id:string}>;searchParams:Promise<{days?:string}>}) {
  await requireAdminRole("admin");
  const days=parsePeriod((await searchParams).days);
  const event=await getAdminTechnicalEvent((await params).id);
  if(!event)notFound();
  const areas:Record<string,string>={ai:"ИИ",database:"База данных",email:"Email",media:"Фото",publication:"Публикация",client:"Браузер"};
  return <><AdminPageHeader title="Техническое событие" description="Сохранённые сведения об ошибке"><Link className={styles.detailLink} href={`/admin/analytics?tab=technical&days=${days ?? "all"}`}>К списку</Link></AdminPageHeader>
    <AdminDetailPanel title="Сведения"><div className={styles.detailGrid}>{[["Дата и время",formatAdminDate(event.date,true)],["Область",areas[event.event.split(".")[1]]??"Сервис"],["Тип события",event.event],["Код ошибки",event.errorCode??"Не сохранён"],["Класс ошибки",event.errorType??"Не сохранён"],["Операция",event.operation??"Не сохранена"]].map(([label,value])=><div key={label} className={styles.detailField}><span>{label}</span><strong>{value}</strong></div>)}</div><p className={styles.analyticsNote}>Причина не сохранена. Идентификатор события сам по себе не содержит описания причины.</p><span className={styles.cellSecondary}>ID события</span><AdminCopyValue value={event.id} label="ID события"/>{event.errorId&&<p><span className={styles.cellSecondary}>Идентификатор ошибки для поиска в логах</span><AdminCopyValue value={event.errorId} label="идентификатор ошибки"/></p>}</AdminDetailPanel>
    <AdminDetailPanel title="Связанные объекты"><div className={styles.detailLinks}>{event.cardId&&<Link className={styles.detailLink} href={`/admin/cards/${event.cardId}`}>Открытка</Link>}{event.reminderId&&<Link className={styles.detailLink} href={`/admin/reminders/${event.reminderId}`}>Заявка на напоминание</Link>}{event.supportId&&<Link className={styles.detailLink} href={`/admin/support?request=${event.supportId}`}>Обращение</Link>}{!event.cardId&&!event.reminderId&&!event.supportId&&<p className={styles.analyticsNote}>Подтверждённой связи с доступным объектом нет.</p>}</div></AdminDetailPanel>
    <AdminDetailPanel title="Диагностика">{Object.entries(event.diagnostics).length?Object.entries(event.diagnostics).map(([key,value])=><p key={key}>{key}: {value}</p>):<p className={styles.analyticsNote}>Дополнительная безопасная диагностика не сохранена.</p>}<p className={styles.analyticsNote}>Это историческое событие. Факт устранения система не хранит.</p></AdminDetailPanel>
  </>;
}
