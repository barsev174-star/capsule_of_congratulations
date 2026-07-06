import type { Metadata } from "next";
import { Inter, Caveat } from "next/font/google";
import "./globals.css";
import { ClientErrorMonitor } from "@/components/telemetry/client-error-monitor";

const inter = Inter({
  subsets: ["latin", "cyrillic"],
  variable: "--font-inter"
});

const caveat = Caveat({
  subsets: ["latin", "cyrillic"],
  variable: "--font-caveat"
});

export const metadata: Metadata = {
  title: "Дари слова",
  description: "Теплые цифровые открытки от одного человека или всей компании."
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru">
      <body className={`${inter.variable} ${caveat.variable}`}><ClientErrorMonitor />{children}</body>
    </html>
  );
}
