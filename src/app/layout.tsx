import type { Metadata, Viewport } from "next";
import { Instrument_Sans, Newsreader } from "next/font/google";
import { Suspense } from "react";
import { MobileNav } from "@/components/nav-links";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { Toaster } from "@/components/toaster";
import { DEFAULT_TITLE, OPEN_GRAPH_BASE, SITE_CARD, SITE_NAME } from "@/lib/seo";
import { siteUrl } from "@/lib/site";
import "./globals.css";

// Instrument Sans: a grotesk with a little warmth, so the UI text has a voice
// of its own next to Newsreader instead of the default Inter look.
const instrumentSans = Instrument_Sans({ subsets: ["latin"], variable: "--font-instrument", display: "swap" });
// Variable, with the optical-size axis: big headlines get Newsreader's
// high-contrast display cut automatically, small text its sturdier text cut.
const newsreader = Newsreader({
  subsets: ["latin"],
  variable: "--font-newsreader",
  display: "swap",
  style: ["normal", "italic"],
  axes: ["opsz"],
});

const description =
  "Post an app you wish existed. No signup. Developers build them and share the link.";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: { default: DEFAULT_TITLE, template: `%s · ${SITE_NAME}` },
  description,
  applicationName: SITE_NAME,
  openGraph: { ...OPEN_GRAPH_BASE, description, images: [SITE_CARD] },
  twitter: { card: "summary_large_image", images: [SITE_CARD.url] },
  formatDetection: { telephone: false },
  // Search Console and Bing Webmaster Tools ownership tags, when configured.
  verification: {
    google: process.env.GOOGLE_SITE_VERIFICATION,
    other: process.env.BING_SITE_VERIFICATION ? { "msvalidate.01": process.env.BING_SITE_VERIFICATION } : undefined,
  },
};

export const viewport: Viewport = {
  themeColor: "#fbf8f1",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${instrumentSans.variable} ${newsreader.variable}`}>
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
