import type { Metadata } from "next";
import { Host_Grotesk } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";

const hostGrotesk = Host_Grotesk({
  subsets: ["latin"],
  variable: "--font-host",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Blueprint — Big ideas, already in your box",
  description:
    "Turn the bricks you already have into the things you imagine.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={hostGrotesk.variable}>
      <body className={`${hostGrotesk.className} antialiased`}>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
