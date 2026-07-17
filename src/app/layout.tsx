import type { Metadata } from "next";
import { Alumni_Sans, Caveat, Inter, PT_Sans } from "next/font/google";
import "./globals.css";
import { ClientErrorMonitor } from "@/components/telemetry/client-error-monitor";

const inter = Inter({
  subsets: ["latin", "cyrillic"],
  variable: "--font-inter"
});

const caveat = Caveat({
  subsets: ["latin", "cyrillic"],
  weight: ["600"],
  variable: "--font-caveat"
});

const alumniSans = Alumni_Sans({
  subsets: ["latin", "cyrillic"],
  weight: ["600", "700"],
  variable: "--font-alumni-sans"
});

const ptSans = PT_Sans({
  subsets: ["latin", "cyrillic"],
  weight: ["400", "700"],
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
  manifest: "/manifest.webmanifest"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru">
      <body className={`${inter.variable} ${caveat.variable} ${alumniSans.variable} ${ptSans.variable}`}><ClientErrorMonitor />{children}</body>
    </html>
  );
}
