import { notFound } from "next/navigation";
import Link from "next/link";
import { getPublicShareEditor } from "@/lib/public-shares/service";
import { PublicSharePanel } from "../public-share-panel";
import styles from "./page.module.css";

export default async function PublicShareEditorPage({ params }: { params: Promise<{ finalSlug: string }> }) {
  const { finalSlug } = await params;
  const editor = await getPublicShareEditor(finalSlug);
  if (!editor) notFound();
  return <main className={styles.page}><header><Link href={`/gift/${finalSlug}`}>← Вернуться к открытке</Link><p>Публичная версия</p><h1>Похвастаться открыткой</h1><span>Выберите только то, чем готовы поделиться.</span></header><PublicSharePanel finalSlug={finalSlug} defaultDisplayName={editor.defaultDisplayName} share={editor.share} photos={editor.photos} mediaAssets={editor.mediaAssets} phraseCandidates={editor.phraseCandidates} publicQualities={editor.publicQualities} wasRevoked={editor.wasRevoked} publicSharePath={editor.publicSharePath} /></main>;
}
