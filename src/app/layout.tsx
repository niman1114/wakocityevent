import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const SITE_URL = "https://wakocityevent.vercel.app";
const SITE_NAME = "和光市のイベント情報";
const DESCRIPTION =
  "和光市・和光樹林公園・サンアゼリア・図書館・商工会・駅前マルシェなど、和光市周辺の最新イベント情報を毎日自動更新でまとめたポータルサイト。マルシェ・コンサート・子育て・講座・お祭りを一覧でチェックできます。";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "和光市のイベント情報 | Wako Events",
    template: "%s | 和光市のイベント情報",
  },
  description: DESCRIPTION,
  keywords: ["和光市", "イベント", "和光市駅", "マルシェ", "サンアゼリア", "和光樹林公園", "和光市図書館", "子育て", "お祭り", "コンサート"],
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "和光市のイベント情報 | Wako Events",
    description: DESCRIPTION,
    url: SITE_URL,
    siteName: SITE_NAME,
    locale: "ja_JP",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "和光市のイベント情報 | Wako Events",
    description: DESCRIPTION,
  },
  verification: {
    google: "jx4hdNa-zAGbFXZOkki0__rwmop2k5ODEBQHHTMj5Vk",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
