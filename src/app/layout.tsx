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

export const metadata: Metadata = {
  title: "和光市のイベント情報 | Wako Events",
  description: "和光市周辺のイベント情報をまとめたポータルサイト。公式サイト、サンアゼリア、商工会の最新イベントを一覧でチェックできます。",
  openGraph: {
    title: "和光市のイベント情報 | Wako Events",
    description: "和光市周辺のイベント情報をまとめたポータルサイト。公式サイト、サンアゼリア、商工会の最新イベントを一覧でチェックできます。",
    url: "https://wakoevent.vercel.app", // 仮のURL、デプロイ後に確定
    siteName: "和光市のイベント情報",
    images: [
      {
        url: "https://images.unsplash.com/photo-1540575467063-178a50c2df87?q=80&w=1200&auto=format&fit=crop", // イベントっぽい画像
        width: 1200,
        height: 630,
        alt: "和光市のイベント情報 Banner",
      },
    ],
    locale: "ja_JP",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "和光市のイベント情報 | Wako Events",
    description: "和光市周辺のイベント情報をまとめたポータルサイト。",
    images: ["https://images.unsplash.com/photo-1540575467063-178a50c2df87?q=80&w=1200&auto=format&fit=crop"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
