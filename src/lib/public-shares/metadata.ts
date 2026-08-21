import type { Metadata } from "next";
import { cardTemplates } from "@/lib/cards/templates";
import type { PublicSharePayload } from "./types";

export type PublicShareOgTemplate = {
  name: string;
  preview: `/${string}`;
  background: string;
  accentSurface: string;
};

const fallbackTemplate: PublicShareOgTemplate = {
  name: "Открытка Slovesto",
  preview: "/brand/og-default-1200x630.png",
  background: "#f7f8fa",
  accentSurface: "#fff0e8"
};

export const getPublicShareOgTemplate = (templateId: string): PublicShareOgTemplate => {
  const template = cardTemplates.find(({ id }) => id === templateId);
  if (!template?.preview) return fallbackTemplate;
  return {
    name: template.name,
    preview: template.preview as `/${string}`,
    background: "#f7f8fa",
    accentSurface: "#fff0e8"
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
  const image = `${path}/image/og`;
  const template = getPublicShareOgTemplate(payload.card.templateId);
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
