import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { ClientErrorMonitor } from "@/components/telemetry/client-error-monitor";
import { YandexMetrikaConsent } from "@/components/analytics/yandex-metrika-consent";

const inter = localFont({
  src: [
    { path: "../../public/fonts/Inter-Variable.ttf", style: "normal", weight: "100 900" },
    { path: "../../public/fonts/Inter-Italic-Variable.ttf", style: "italic", weight: "100 900" }
  ],
  display: "swap",
  variable: "--font-inter"
});

const caveat = localFont({
  src: "../../public/fonts/Caveat-Variable.ttf",
  display: "swap",
  weight: "400 700",
  variable: "--font-caveat"
});

const alumniSans = localFont({
  src: "../../public/fonts/AlumniSans-Variable.ttf",
  display: "swap",
  weight: "100 900",
  variable: "--font-alumni-sans"
});

const ptSans = localFont({
  src: [
    { path: "../../public/fonts/PTSans-Regular.ttf", weight: "400", style: "normal" },
    { path: "../../public/fonts/PTSans-Bold.ttf", weight: "700", style: "normal" }
  ],
  display: "swap",
  variable: "--font-pt-sans"
});

export const metadata: Metadata = {
  metadataBase: new URL("https://slovesto.ru"),
  title: {
    default: "Slovesto",
    template: "%s | Slovesto"
  },
  description: "Онлайн-открытки, поздравления и подарки.",
  openGraph: {
    type: "website",
    locale: "ru_RU",
    siteName: "Slovesto",
    images: [{ url: "/brand/og-default-1200x630.png", width: 1200, height: 630, alt: "Slovesto" }]
  },
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/favicon.ico", sizes: "any" }
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }]
  },
  verification: {
    google: "so0EBZVqU-NlGXl8N6u_jTcRVkQlspeCmVMn98mFrGM"
  },
  manifest: "/manifest.webmanifest"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru">
      <body className={`${inter.variable} ${caveat.variable} ${alumniSans.variable} ${ptSans.variable}`}><ClientErrorMonitor />{children}<YandexMetrikaConsent /></body>
    </html>
  );
}
