import type { Metadata } from "next";
import { Inter, Caveat } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin", "cyrillic"],
  variable: "--font-inter"
});

const caveat = Caveat({
  subsets: ["latin", "cyrillic"],
  variable: "--font-caveat"
});

export const metadata: Metadata = {
  title: "Открытка от всех",
  description: "Сервис групповых поздравлений и цифровых открыток."
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru">
      <body className={`${inter.variable} ${caveat.variable}`}>{children}</body>
    </html>
  );
}
