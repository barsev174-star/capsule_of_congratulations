import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { unstable_noStore as noStore } from "next/cache";
import { FinalCard } from "@/components/final-card/final-card";
import { getPublicShareDraftPreviewPresentation } from "@/lib/public-shares/service";
import styles from "./page.module.css";

export const metadata: Metadata = {
  title: "Предпросмотр публичной открытки — Slovesto",
  robots: { index: false, follow: false },
  referrer: "no-referrer"
};

export default async function PublicShareDraftPreviewPage({ params }: { params: Promise<{ finalSlug: string }> }) {
  noStore();
  const { finalSlug } = await params;
  const presentation = await getPublicShareDraftPreviewPresentation(finalSlug);
  if (!presentation) notFound();

  return <main className={styles.page}>
    <div className={styles.previewBar}><Link href={`/gift/${finalSlug}/share`}>← Вернуться к настройке</Link><strong>Предпросмотр черновика</strong><span>Эта страница видна только вам</span></div>
    <FinalCard model={presentation.model} mode="draft-preview" />
  </main>;
}
