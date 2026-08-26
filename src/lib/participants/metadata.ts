import type { Metadata } from "next";
import { getPublicShareOgTemplate } from "@/lib/public-shares/metadata";

// Accept only the template, never the recipient, contributions or private links.
export const buildParticipantLinkMetadata = (slug: string, templateId: string | null, collectionClosed = false): Metadata => {
  if (!templateId) {
    const title = "Приглашение недоступно — Slovesto";
    return {
      title: { absolute: title }, description: "Ссылка для сбора поздравлений недоступна.",
      robots: { index: false, follow: false },
      openGraph: { title, images: [] }, twitter: { title, card: "summary", images: [] }
    };
  }
  const title = collectionClosed ? "Сбор поздравлений завершён — Slovesto" : "Добавьте поздравление в общую открытку — Slovesto";
  const description = collectionClosed ? "Организатор завершил сбор поздравлений для этой открытки." : "Напишите несколько тёплых слов — они станут частью общего подарка.";
  const path = `/join/${encodeURIComponent(slug)}`;
  const template = getPublicShareOgTemplate(templateId);
  const image = {
    url: template.socialImage, width: 1200, height: 630,
    alt: `Приглашение в открытку Slovesto, шаблон «${template.name}»`
  };
  return {
    title: { absolute: title }, description,
    robots: { index: false, follow: false }, alternates: { canonical: path },
    openGraph: { type: "website", siteName: "Slovesto", locale: "ru_RU", url: path, title, description, images: [image] },
    twitter: { card: "summary_large_image", title, description, images: [image] }
  };
};
