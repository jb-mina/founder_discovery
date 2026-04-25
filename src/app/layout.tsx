import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";

const geist = Geist({ subsets: ["latin"], variable: "--font-geist" });

export const metadata: Metadata = {
  title: "My 0to1",
  description: "나와 맞는 문제·고객·솔루션 핏을 찾는 0to1 비즈니스 운영체제",
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
