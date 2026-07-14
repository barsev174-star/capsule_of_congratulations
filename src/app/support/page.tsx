import Link from "next/link";
import { BrandLogo } from "@/components/brand/brand-logo";
import type { Metadata } from "next";
import { SupportForm } from "./support-form";
import styles from "./support.module.css";

export const metadata: Metadata = {
  title: "Поддержка",
  description: "Сообщить о проблеме, задать вопрос или предложить улучшение сервиса Slovesto."
};

const allowedSources = ["landing", "create", "join", "manage", "gift", "other"];

type Props = { searchParams: Promise<{ from?: string }> };

export default async function SupportPage({ searchParams }: Props) {
  const { from } = await searchParams;
  const source = from && allowedSources.includes(from) ? from : "other";

  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <header className={styles.header}>
          <Link href="/" className={styles.brand}><BrandLogo /></Link>
          <Link href="/" className={styles.backLink}>На главную</Link>
        </header>

        <section className={styles.intro}>
          <p className={styles.eyebrow}>Мы рядом</p>
          <h1>Расскажите, чем помочь</h1>
          <p>
            Если что-то не работает, непонятно или у вас появилась хорошая идея — напишите нам.
            Такие сообщения помогают делать Slovesto удобнее.
          </p>
        </section>

        <section className={styles.card}>
          <SupportForm source={source} />
        </section>
      </div>
    </main>
  );
}
