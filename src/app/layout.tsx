// src/app/layout.tsx

import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { AttributionInit } from "@/components/tracking/AttributionInit";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ?? "https://boiseplumbing.com"
  ),
  title: {
    default: "Boise Plumbing | 24/7 Emergency Plumber Boise, ID",
    template: "%s | Boise Plumbing",
  },
  description:
    "Boise's trusted local plumber. Emergency service, drain cleaning, water heater repair. Licensed & insured.",
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <AttributionInit />
        {children}
      </body>
    </html>
  );
}
