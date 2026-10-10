import { CtaBand } from "@/components/marketing/cta-band";
import { Faq } from "@/components/marketing/faq";
import { Features } from "@/components/marketing/features";
import { Hero } from "@/components/marketing/hero";
import { HowItWorks } from "@/components/marketing/how-it-works";
import { Pricing } from "@/components/marketing/pricing";
import { ProductPreview } from "@/components/marketing/product-preview";
import { StatsStrip } from "@/components/marketing/stats-strip";

/** Voltline marketing page. Fully static: prerendered at build time. */
export default function SolarLandingPage() {
  return (
    <>
      <Hero />
      <StatsStrip />
      <HowItWorks />
      <Features />
      <ProductPreview />
      <Pricing />
      <Faq />
      <CtaBand />
    </>
  );
}
