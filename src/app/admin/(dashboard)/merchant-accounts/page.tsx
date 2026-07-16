import { requireAdminRole } from "@/lib/admin/session";
import { listMerchantAccounts } from "@/lib/payments/merchant-accounts";
import { createMerchantAccountAction } from "../../actions-phase2";
import styles from "../../admin.module.css";

export default async function MerchantAccountsPage() {
  await requireAdminRole("admin");
  const accounts = await listMerchantAccounts();
  return <>
    <h1 className={styles.pageTitle}>Платёжные аккаунты</h1>
    <p className={styles.pageSubtitle}>Секреты не сохраняются в базе: укажите только имя набора переменных окружения.</p>
    <section className={styles.panel}>
      <form action={createMerchantAccountAction} className={styles.filters}>
        <input name="merchantLogin" required placeholder="MerchantLogin" className={styles.searchInput} />
        <input name="secretReference" required placeholder="Напр. ROBOKASSA_PRIMARY" className={styles.searchInput} />
        <input name="sellerFullName" required placeholder="ФИО продавца" className={styles.searchInput} />
        <input name="sellerInn" required inputMode="numeric" placeholder="ИНН" className={styles.searchInput} />
        <select name="status" className={styles.statusSelect}><option value="TEST">Тестовый</option><option value="ACTIVE">Боевой</option></select>
        <button type="submit" className={styles.filterButton}>Добавить</button>
      </form>
      {accounts.length === 0 ? <p className={styles.emptyState}>Платёжные аккаунты ещё не добавлены.</p> : accounts.map((account) => <p key={account.id}><strong>{account.merchantLogin}</strong> — {account.status}, {account.sellerFullName}, ИНН {account.sellerInn}, secrets: {account.secretReference}</p>)}
    </section>
  </>;
}
