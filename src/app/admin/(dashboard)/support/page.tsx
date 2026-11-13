import { requireAdminRole } from "@/lib/admin/session";
import { listSupportRequests } from "@/lib/support/repository";
import { listSupportNotificationDeliveries } from "@/lib/support/notifications-repository";
import type { SupportRequestStatus } from "@/lib/support/types";
import { formatAdminDate,parsePage } from "@/lib/admin/format";
import { retrySupportNotificationAction,updateSupportRequestStatusAction } from "../../actions-support";
import { AdminDataTable,AdminFilterBar,AdminPageHeader,AdminPagination,AdminStatusBadge } from "../../components/admin-ui";
import { AdminStatus } from "../../components/admin-status";
import { AdminConfirmDialog } from "../../components/admin-confirm-dialog";
import { AdminObjectDetails } from "../../components/admin-object-details";
import styles from "../../admin.module.css";
const categories={problem:"Проблема",suggestion:"Предложение",question:"Вопрос"};
type Params={status?:string;page?:string;request?:string};
export default async function AdminSupportPage({searchParams}:{searchParams:Promise<Params>}) {
  await requireAdminRole("support");
  const params=await searchParams,page=parsePage(params.page);
  const rows=await listSupportRequests(["new","in_progress","resolved"].includes(params.status ?? "")?params.status as SupportRequestStatus:undefined,{limit:21,offset:(page-1)*20});
  const deliveries=await listSupportNotificationDeliveries(rows.slice(0,20).map(r=>r.id));
  return <><AdminPageHeader title="Обращения" description="Вопросы, проблемы и предложения пользователей."/>
  <AdminFilterBar resetHref="/admin/support"><label className={styles.filterField}>Статус<select className={styles.statusSelect} name="status" defaultValue={params.status ?? ""}><option value="">Все</option><option value="new">Новое</option><option value="in_progress">В работе</option><option value="resolved">Решено</option></select></label></AdminFilterBar>
  <section className={styles.panel}><AdminDataTable label="Обращения" rows={rows.slice(0,20)} empty="Обращений пока нет." columns={[
    {key:"topic",label:"Тема",render:(r)=><>{categories[r.category]}<p className={styles.textPreview}>{r.message}</p></>},
    {key:"contact",label:"Пользователь",render:(r)=><>{r.contactName}<span className={styles.cellSecondary}>{r.email}</span></>},
    {key:"status",label:"Статус",render:(r)=><AdminStatus domain="support" value={r.status}/>},
    {key:"date",label:"Дата",render:(r)=>formatAdminDate(r.createdAt,true)},
    {key:"detail",label:"Подробности",render:(r)=><AdminObjectDetails title={categories[r.category]} initiallyOpen={params.request===r.id}><div><p style={{whiteSpace:"pre-wrap"}}>{r.message}</p><p className={styles.analyticsNote}>Источник: {r.source}</p><div className={styles.statusStack}>{(["new","in_progress","resolved"] as const).filter(status=>status!==r.status).map(status=><form key={status} action={updateSupportRequestStatusAction}><input type="hidden" name="requestId" value={r.id}/><input type="hidden" name="status" value={status}/><button type="submit" className={styles.actionButton}>{status==="resolved"?"Решено":status==="in_progress"?"В работу":"Вернуть в новые"}</button></form>)}</div><h3 className={styles.analyticsSubheading}>Уведомления</h3>{deliveries.filter(d=>d.supportRequestId===r.id).length===0?<p className={styles.analyticsNote}>Ранее не отправлялось</p>:deliveries.filter(d=>d.supportRequestId===r.id).map(delivery=><div key={delivery.id} className={styles.notificationList}><AdminStatusBadge tone={delivery.status==="failed"?"error":delivery.status==="sent"?"success":"info"}>{delivery.status==="failed"?"Ошибка":delivery.status==="sent"?"Отправлено":delivery.status==="sending"?"Отправляется":"В очереди"}</AdminStatusBadge>{delivery.status==="failed"&&<form action={retrySupportNotificationAction}><input type="hidden" name="deliveryId" value={delivery.id}/><AdminConfirmDialog danger={false} message="Повторить уведомление об обращении?">Повторить</AdminConfirmDialog></form>}</div>)}</div></AdminObjectDetails>}
  ]}/></section><AdminPagination pathname="/admin/support" params={params} page={page} hasNext={rows.length>20}/></>;
}
