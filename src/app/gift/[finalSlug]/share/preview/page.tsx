import Link from "next/link";
import { notFound } from "next/navigation";
import { getPublicShareEditor } from "@/lib/public-shares/service";
import { listContributionsByCardId } from "@/lib/cards/repository";
import styles from "./page.module.css";

const headlines = {
  GIFTED_CARD: "Мне подарили открытку",
  THANK_YOU: "Спасибо за этот подарок",
  LOOK_WHAT_I_GOT: "Посмотрите, что мне подарили"
};

export default async function PublicShareDraftPreviewPage({ params }: { params: Promise<{ finalSlug: string }> }) {
  const { finalSlug } = await params;
  const editor = await getPublicShareEditor(finalSlug);
  if (!editor?.share) notFound();
  const contributions = await listContributionsByCardId(editor.card.id);
  const selectedPhotoIds = new Set(editor.photos.map((photo) => photo.cardMediaAssetId));
  const photos = editor.mediaAssets.filter((asset) => selectedPhotoIds.has(asset.id));
  const phraseTexts = editor.share.publicPhrases.map((phrase) => phrase.text);
  const share = editor.share;

  return <main className={styles.page}>
    <div className={styles.previewBar}><Link href={`/gift/${finalSlug}/share`}>← Вернуться к настройке</Link><strong>Предпросмотр черновика</strong><span>Эта страница видна только вам</span></div>
    <section className={`${styles.paper} ${styles.hero}`}>
      <span className={styles.brand}>Slovesto</span>
      <p className={styles.eyebrow}>{headlines[share.headlinePreset]}</p>
      <h1>{share.displayName || "Мне подарили открытку"}</h1>
      {share.showOccasion ? <p className={styles.occasion}>{editor.card.occasionText}</p> : null}
      <p className={styles.intro}>Это публичная часть подарка. Полная открытка с личными поздравлениями и фотографиями доступна только получателю.</p>
      {(share.showGreetingCount || share.showPhotoCount) ? <div className={styles.stats}>{share.showGreetingCount ? <span>{contributions.length} поздравлений</span> : null}{share.showPhotoCount ? <span>{editor.mediaAssets.length} фото</span> : null}</div> : null}
    </section>
    {editor.publicQualities.length ? <section className={styles.qualities}><h2>За что меня ценят</h2><div>{editor.publicQualities.map((quality) => <span key={quality.id}>{quality.text}</span>)}</div></section> : null}
    {phraseTexts.length ? <section className={styles.paper}><h2>Лучшие фразы</h2><div className={styles.phrases}>{phraseTexts.map((phrase) => <blockquote key={phrase}>{phrase}</blockquote>)}</div></section> : null}
    {photos.length ? <section className={`${styles.paper} ${styles.moments}`}><h2>Моменты</h2><div className={styles.photoRail}>{photos.map((photo) => <figure key={photo.id}><img src={photo.publicUrl} alt={photo.captionTitle || "Выбранное фото"} /><figcaption>{editor.photos.find((item) => item.cardMediaAssetId === photo.id)?.publicCaption}</figcaption></figure>)}</div></section> : null}
  </main>;
}
