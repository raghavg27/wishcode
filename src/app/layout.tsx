import type { Metadata, Viewport } from "next";
import { Inter, Newsreader } from "next/font/google";
import { Suspense } from "react";
import { MobileNav } from "@/components/nav-links";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { Toaster } from "@/components/toaster";
import { siteUrl } from "@/lib/site";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const newsreader = Newsreader({
  subsets: ["latin"],
  variable: "--font-newsreader",
  display: "swap",
  style: ["normal", "italic"],
  weight: ["400", "500", "600"],
});

const description =
  "Post an app you wish existed. No signup. Developers build them and share the link.";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: { default: "Wishcode — apps people wish existed", template: "%s · Wishcode" },
  description,
  applicationName: "Wishcode",
  openGraph: { type: "website", siteName: "Wishcode", description },
  twitter: { card: "summary_large_image" },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: "#fbf8f1",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${inter.variable} ${newsreader.variable}`}>
      <body className="flex min-h-dvh flex-col">
        <a
          href="#main"
          className="sr-only z-[70] rounded-lg bg-amber px-4 py-2 text-label font-semibold focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
        >
          Skip to content
        </a>
        <SiteHeader />
        <div id="main" className="flex flex-1 flex-col">
          {children}
        </div>
        <SiteFooter />
        <Suspense>
          <MobileNav />
        </Suspense>
        <Toaster />
      </body>
    </html>
  );
}
