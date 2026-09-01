import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: "/roadmap"
    },
    sitemap: "https://slovesto.ru/sitemap.xml",
    host: "https://slovesto.ru"
  };
}
