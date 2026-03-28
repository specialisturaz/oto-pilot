import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";

const inter = Inter({
  subsets: ["latin", "latin-ext"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "Emlak CRM - Türkiye'nin En Gelişmiş Emlak Yönetim Sistemi",
  description:
    "Türkiye emlak sektörü için geliştirilmiş profesyonel CRM sistemi. İlan yönetimi, müşteri takibi, satış pipeline, komisyon hesaplama, sahibinden/hepsiemlak/emlakjet portal entegrasyonları ile emlak ofislerinin tüm ihtiyaçları tek platformda.",
  keywords: [
    "emlak",
    "crm",
    "gayrimenkul",
    "türkiye",
    "ilan yönetimi",
    "müşteri takibi",
    "emlak yazılımı",
    "emlak ofisi",
    "sahibinden",
    "hepsiemlak",
    "komisyon takibi",
  ],
  authors: [{ name: "Emlak CRM" }],
  robots: "index, follow",
  openGraph: {
    type: "website",
    locale: "tr_TR",
    url: "https://emlakcrm.com.tr",
    siteName: "Emlak CRM",
    title: "Emlak CRM - Türkiye'nin En Gelişmiş Emlak Yönetim Sistemi",
    description:
      "Emlak ofisleri için profesyonel CRM: ilan yönetimi, müşteri takibi, satış pipeline, portal entegrasyonları.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Emlak CRM - Emlak Yönetim Sistemi",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Emlak CRM - Türkiye'nin En Gelişmiş Emlak Yönetim Sistemi",
    description:
      "Emlak ofisleri için profesyonel CRM: ilan yönetimi, müşteri takibi, satış pipeline, portal entegrasyonları.",
    images: ["/og-image.png"],
  },
  other: {
    "content-language": "tr",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0a" },
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
