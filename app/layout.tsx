import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Newsreader } from "next/font/google";
import { AtlasProvider } from "@/components/providers/atlas-provider";
import { PaywallModal } from "@/components/paywall/paywall-modal";
import { SuccessBanner } from "@/components/paywall/success-banner";
import { InertRoot } from "@/components/providers/inert-root";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const newsreader = Newsreader({
  variable: "--font-newsreader",
  subsets: ["latin"],
  style: ["normal", "italic"],
});

export const metadata: Metadata = {
  title: {
    default: "Field Atlas — map any field of knowledge",
    template: "%s · Field Atlas",
  },
  description:
    "Name any field and get its complete map: every area and subtopic, core equations, open problems, how the parts connect, the best learning order and a full vocabulary.",
};

export const viewport: Viewport = {
  themeColor: "#070a12",
  colorScheme: "dark",
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${newsreader.variable} h-full`}
    >
      <body className="min-h-full bg-canvas font-sans text-ink antialiased">
        {/*
          AtlasProvider is the global mounting check: on first client mount it
          looks for ?pay_success=true, unlocks Pro and clears the usage counter.
        */}
        <AtlasProvider>
          <SuccessBanner />
          <InertRoot>{children}</InertRoot>
          <PaywallModal />
        </AtlasProvider>
      </body>
    </html>
  );
}
