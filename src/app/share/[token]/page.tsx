import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { TemplateCardRenderer } from "@/components/templates/template-card-renderer";
import { JourneyEvent } from "@/components/telemetry/journey-event";
import { getPublicSharePayload, getPublicSharePresentation } from "@/lib/public-shares/service";
import { ShareActions } from "./share-actions";
import styles from "./page.module.css";

type Props = { params: Promise<{ token: string }> };

export const generateMetadata = async ({ params }: Props): Promise<Metadata> => {
  const { token } = await params;
  const payload = await getPublicSharePayload(token);
  if (!payload) return { robots: { index: false, follow: false }, title: "Открытка недоступна — Slovesto" };
  const title = `${payload.share.displayName!} делится открыткой — Slovesto`;
  return { title, description: "Тёплая публичная часть подарка от Slovesto.", robots: { index: false, follow: false }, openGraph: { title, description: "Тёплая публичная часть подарка от Slovesto.", ...(payload.version === 1 ? { images: [`/share/${encodeURIComponent(token)}/image/og`] } : {}) } };
};

export default async function PublicSharePage({ params }: Props) {
  const { token } = await params;
  const presentation = await getPublicSharePresentation(token);
  if (!presentation) notFound();
  return <main className={styles.page}>
    <JourneyEvent event="PUBLIC_SHARE_OPENED" route="share" />
    {presentation.kind === "universal-v1"
      ? <TemplateCardRenderer dispatch={presentation.dispatch} model={presentation.model} surface="public" />
      : <TemplateCardRenderer dispatch={presentation.dispatch} model={presentation.model} mode="public" />}
    <section className={styles.actions}><ShareActions publicName={presentation.publicName} token={token} /></section>
  </main>;
}
