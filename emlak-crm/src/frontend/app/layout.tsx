import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";

const inter = Inter({
  subsets: ["latin", "latin-ext"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "Emlak CRM - Türkiye Emlak Yönetim Sistemi",
  description:
    "Türkiye emlak sektörü için geliştirilmiş profesyonel müşteri ilişkileri yönetim sistemi. İlan yönetimi, müşteri takibi, satış pipeline ve portal entegrasyonları.",
  keywords: [
    "emlak",
    "crm",
    "gayrimenkul",
    "türkiye",
    "ilan yönetimi",
    "müşteri takibi",
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="tr" suppressHydrationWarning>
      <body className={`${inter.variable} font-sans antialiased`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
