import type { Metadata } from "next";
import { SiteFooter } from "@/components/marketing/site-footer";
import { SiteHeader } from "@/components/marketing/site-header";

export const metadata: Metadata = {
  title: { absolute: "Voltline — Blueprint-to-Proposal Engine for Solar & Roofing" },
  description:
    "Upload a roof plan and get a draft proposal with a priced bill of materials and a code and zoning checklist in minutes.",
  openGraph: {
    title: "Voltline — From blueprint to bid-ready proposal in minutes",
    description:
      "An AI takeoff, an editable priced BOM and a code and zoning checklist, generated from your roof plan.",
    type: "website",
  },
};

/** Public marketing chrome for /solar: sticky header, page content, footer. */
export default function SolarMarketingLayout({ children }: LayoutProps<"/solar">) {
  return (
    <div className="flex min-h-dvh flex-col bg-background text-foreground">
      <a
        href="#main"
        className="sr-only z-50 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
      >
        Skip to content
      </a>
      <SiteHeader />
      <main id="main" className="flex-1">
        {children}
      </main>
      <SiteFooter />
    </div>
  );
}
