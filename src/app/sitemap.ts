import type { MetadataRoute } from "next";

const siteUrl = "https://slovesto.ru";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: siteUrl, changeFrequency: "weekly", priority: 1 },
    { url: `${siteUrl}/gruppovaya-otkrytka/uchitelyu`, changeFrequency: "monthly", priority: 0.8 },
    { url: `${siteUrl}/gruppovaya-otkrytka/vospitatelyu`, changeFrequency: "monthly", priority: 0.8 },
    { url: `${siteUrl}/gruppovaya-otkrytka/kollege`, changeFrequency: "monthly", priority: 0.8 },
    { url: `${siteUrl}/example`, changeFrequency: "monthly", priority: 0.7 }
  ];
}
