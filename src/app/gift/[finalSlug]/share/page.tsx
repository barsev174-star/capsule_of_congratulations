import { notFound } from "next/navigation";
import Link from "next/link";
import { getPublicShareEditor } from "@/lib/public-shares/service";
import { PublicSharePanel } from "../public-share-panel";
import styles from "./page.module.css";

export default async function PublicShareEditorPage({ params }: { params: Promise<{ finalSlug: string }> }) {
  const { finalSlug } = await params;
  const editor = await getPublicShareEditor(finalSlug);
  if (!editor) notFound();
  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <Link className={styles.backLink} href={`/gift/${finalSlug}`}>← Вернуться к открытке</Link>
        <p className={styles.eyebrow}>Публичная версия</p>
        <h1 className={styles.title}>Поделиться открыткой</h1>
        <p className={styles.subtitle}>
          Выберите, что будет видно на публичной странице.<br />
          Личные поздравления и остальные фотографии останутся только в полной открытке.
        </p>
      </header>
      <PublicSharePanel
        finalSlug={finalSlug}
        defaultDisplayName={editor.defaultDisplayName}
        share={editor.share}
        photos={editor.photos}
        mediaAssets={editor.mediaAssets}
        phraseCandidates={editor.phraseCandidates}
        publicQualities={editor.publicQualities}
        wasRevoked={editor.wasRevoked}
        publicSharePath={editor.publicSharePath}
        hasEventDate={editor.hasEventDate}
        requiresThreePhotos={editor.requiresThreePhotos}
      />
    </main>
  );
}
