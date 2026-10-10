import type { Metadata, Viewport } from "next";
import { Newsreader } from "next/font/google";
import { AtlasProvider } from "@/components/providers/atlas-provider";
import { PaywallModal } from "@/components/paywall/paywall-modal";
import { PaymentBanner } from "@/components/paywall/payment-banner";
import { InertRoot } from "@/components/providers/inert-root";
import "./atlas.css";

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

/**
 * Field Atlas lives in its own route group so its indigo theme tokens
 * (scoped to `.atlas-theme`) never collide with the amber design system used
 * by the solar proposal app under /dashboard.
 */
export default function AtlasLayout({ children }: LayoutProps<"/">) {
  return (
    <div
      className={`atlas-theme ${newsreader.variable} min-h-screen bg-canvas font-sans text-ink antialiased`}
    >
      {/*
        AtlasProvider is the global mounting check: on first client mount it
        looks for ?pay_success=true&session_id=..., has the server verify the
        payment with Stripe, then unlocks Pro and clears the usage counter.
      */}
      <AtlasProvider>
        <PaymentBanner />
        <InertRoot>{children}</InertRoot>
        <PaywallModal />
      </AtlasProvider>
    </div>
  );
}
