import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdminRole } from "@/lib/admin/session";
import { getAdminPaymentAttempt } from "@/lib/admin/finances";
import { formatAdminDate, formatMoney } from "@/lib/admin/format";
import { AdminPageHeader, AdminDetailPanel } from "../../../components/admin-ui";
import { AdminStatus } from "../../../components/admin-status";
import styles from "../../../admin.module.css";
export default async function AdminPaymentDetailPage({ params }: { params:Promise<{id:string}> }) {
  await requireAdminRole("admin");
  const attempt=await getAdminPaymentAttempt((await params).id);
  if(!attempt) notFound();
  return <><AdminPageHeader title={`Платёж #${attempt.id.slice(0,8)}`}><Link className={styles.detailLink} href="/admin/payments">К списку</Link></AdminPageHeader><AdminDetailPanel title="Операция"><div className={styles.detailGrid}>
    {[["ID попытки",attempt.id],["Операция провайдера",attempt.providerPaymentId ?? "Не присвоен"],["Провайдер",attempt.provider],["Сумма",formatMoney(attempt.amount,attempt.currency)],["Создана",formatAdminDate(attempt.createdAt,true)],["Обновлена",formatAdminDate(attempt.updatedAt,true)]].map(([label,value]) => <div className={styles.detailField} key={label}><span>{label}</span><strong>{value}</strong></div>)}
    <div className={styles.detailField}><span>Статус</span><AdminStatus domain="attempt" value={attempt.status} /></div></div><Link className={styles.detailLink} href={`/admin/orders/${attempt.orderId}`}>Связанный заказ</Link></AdminDetailPanel></>;
}
