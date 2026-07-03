import Link from "next/link";
import type { Metadata } from "next";
import { AccountLoginForm } from "./login-form";
import styles from "../account.module.css";

export const metadata: Metadata = { title: "Мои открытки — Дари слова" };

type Props = { searchParams: Promise<{ error?: string }> };

export default async function AccountLoginPage({ searchParams }: Props) {
  const { error } = await searchParams;
  return (
    <main className={styles.page}>
      <div className={styles.loginShell}>
        <Link href="/" className={styles.brand}>Дари слова<span>♡</span></Link>
        <section className={styles.loginCard}>
          <p className={styles.eyebrow}>Для организатора</p>
          <h1>Ваши открытки всегда под рукой</h1>
          <p className={styles.lead}>Введите email, указанный при создании открытки. Мы пришлём безопасную ссылку для входа.</p>
          {error ? <div className={styles.error}>Ссылка недействительна или уже использована. Запросите новую.</div> : null}
          <AccountLoginForm />
        </section>
      </div>
    </main>
  );
}
