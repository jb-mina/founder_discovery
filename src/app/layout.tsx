import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";

const geist = Geist({ subsets: ["latin"], variable: "--font-geist" });

export const metadata: Metadata = {
  title: "Founder Discovery OS",
  description: "나만의 문제와 고객을 찾는 개인 발견 시스템",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko" className={`${geist.variable} h-full`}>
      <body className="min-h-full bg-canvas text-foreground font-sans antialiased">
        {children}
      </body>
    </html>
  );
}
