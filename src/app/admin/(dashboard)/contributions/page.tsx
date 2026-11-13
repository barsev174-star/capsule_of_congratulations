import Link from "next/link";
import { listAdminContributions } from "@/lib/admin/repository";
import type { ContributionStatus } from "@/lib/cards/types";
import { requireAdminRole } from "@/lib/admin/session";
import { formatAdminDate,parsePage,parseFilterDate } from "@/lib/admin/format";
import { updateContributionStatusAdminAction } from "../../actions";
import { AdminDataTable,AdminFilterBar,AdminPageHeader,AdminPagination } from "../../components/admin-ui";
import { AdminStatus } from "../../components/admin-status";
import { AdminConfirmDialog } from "../../components/admin-confirm-dialog";
import { AdminObjectDetails } from "../../components/admin-object-details";
import styles from "../../admin.module.css";
type Params={status?:string;search?:string;card?:string;from?:string;to?:string;page?:string};
export default async function AdminContributionsPage({searchParams}:{searchParams:Promise<Params>}) {
  const session=await requireAdminRole("support");
  const params=await searchParams,page=parsePage(params.page);
  const rows=await listAdminContributions({status:["visible","hidden","deleted"].includes(params.status ?? "")?params.status as ContributionStatus:undefined,search:params.search?.trim(),cardId:/^[0-9a-f-]{36}$/i.test(params.card ?? "")?params.card:undefined,from:parseFilterDate(params.from),to:parseFilterDate(params.to),limit:21,offset:(page-1)*20});
  return <><AdminPageHeader title="Поздравления" description="Полное содержание и модерация доступны в подробностях." />
  <AdminFilterBar resetHref="/admin/contributions">
    <label className={styles.filterField}>Поиск<input className={styles.searchInput} type="search" name="search" defaultValue={params.search} placeholder="Автор или текст" /></label>
    <label className={styles.filterField}>Статус<select className={styles.statusSelect} name="status" defaultValue={params.status ?? ""}><option value="">Все</option><option value="visible">Видимые</option><option value="hidden">Скрытые</option><option value="deleted">Удалённые</option></select></label>
    <label className={styles.filterField}>ID открытки<input className={styles.searchInput} name="card" defaultValue={params.card} /></label>
    <label className={styles.filterField}>С даты<input className={styles.searchInput} type="date" name="from" defaultValue={params.from} /></label>
    <label className={styles.filterField}>По дату<input className={styles.searchInput} type="date" name="to" defaultValue={params.to} /></label>
  </AdminFilterBar>
  <section className={styles.panel}><AdminDataTable label="Поздравления" rows={rows.slice(0,20)} columns={[
    {key:"author",label:"Автор",render:(r)=>r.authorName},
    {key:"text",label:"Текст",render:(r)=><p className={styles.textPreview}>{r.message}</p>},
    {key:"card",label:"Открытка",render:(r)=>session.role!=="support"?<Link href={`/admin/cards/${r.cardId}`}>{r.recipientName?.trim()||"Получатель не указан"}</Link>:r.recipientName?.trim()||"Получатель не указан"},
    {key:"status",label:"Статус",render:(r)=><AdminStatus domain="contribution" value={r.status} />},
    {key:"date",label:"Дата",render:(r)=>formatAdminDate(r.createdAt)},
    {key:"action",label:"Подробности",render:(r)=><AdminObjectDetails title={`Поздравление · ${r.authorName}`}><div><p style={{whiteSpace:"pre-wrap"}}>{r.message}</p><div className={styles.statusStack}>{(["visible","hidden","deleted"] as const).filter(s=>s!==r.status).map(status=><form key={status} action={updateContributionStatusAdminAction}><input type="hidden" name="contributionId" value={r.id}/><input type="hidden" name="status" value={status}/>{status==="deleted"?<AdminConfirmDialog message="Удалить поздравление из открытки?">Удалить</AdminConfirmDialog>:<button type="submit" className={styles.actionButton}>{status==="visible"?"Восстановить":"Скрыть"}</button>}</form>)}</div></div></AdminObjectDetails>}
  ]}/></section><AdminPagination pathname="/admin/contributions" params={params} page={page} hasNext={rows.length>20}/></>;
}
