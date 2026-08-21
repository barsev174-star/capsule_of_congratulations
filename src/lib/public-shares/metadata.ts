import type { Metadata } from "next";
import { cardTemplates } from "@/lib/cards/templates";
import type { PublicSharePayload } from "./types";

export type PublicShareOgTemplate = {
  name: string;
  socialImage: `/${string}`;
};

const fallbackTemplate: PublicShareOgTemplate = {
  name: "Открытка Slovesto",
  socialImage: "/assets/share-og/paper-birthday-v1.png"
};

export const getPublicShareOgTemplate = (templateId: string): PublicShareOgTemplate => {
  const template = cardTemplates.find(({ id }) => id === templateId);
  if (!template) return fallbackTemplate;
  return {
    name: template.name,
    socialImage: `/assets/share-og/${template.id}-v1.png`
  };
};

export const buildPublicShareMetadata = (token: string, payload: PublicSharePayload | null): Metadata => {
  if (!payload) {
    return { robots: { index: false, follow: false }, title: "Открытка недоступна — Slovesto" };
  }
  const title = "Публичная открытка — Slovesto";
  const description = "Тёплые слова и моменты, которыми хочется поделиться.";
  const encodedToken = encodeURIComponent(token);
  const path = `/share/${encodedToken}`;
  const template = getPublicShareOgTemplate(payload.card.templateId);
  const image = template.socialImage;
  const imageDescription = `Публичная открытка Slovesto, шаблон «${template.name}»`;
  return {
    title,
    description,
    robots: { index: false, follow: false },
    alternates: { canonical: path },
    openGraph: {
      type: "website",
      url: path,
      title,
      description,
      images: [{ url: image, width: 1200, height: 630, alt: imageDescription }]
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [{ url: image, alt: imageDescription }]
    }
  };
};
