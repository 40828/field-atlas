import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { BrandMark, BrandWordmark } from "@/components/solar/brand";
import { ThemeToggle } from "@/components/solar/theme-toggle";

/** Minimal chrome for long-form legal pages (the marketing header's anchors don't apply here). */
export default function LegalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col bg-background text-foreground">
      <header className="border-b border-border px-4 sm:px-6">
        <div className="mx-auto flex h-16 w-full max-w-3xl items-center gap-3">
          <Link href="/solar" className="flex items-center gap-2.5" aria-label="Voltline home">
            <BrandMark />
            <BrandWordmark />
          </Link>
          <Link
            href="/solar"
            className="ml-auto inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="size-4" /> Back to site
          </Link>
          <ThemeToggle />
        </div>
      </header>
      <main id="main" className="mx-auto w-full max-w-3xl flex-1 px-4 py-12 sm:px-6">
        <article className="space-y-6 text-[15px] leading-7 text-foreground/90 [&_h1]:text-3xl [&_h1]:font-semibold [&_h1]:tracking-tight [&_h2]:mt-10 [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:tracking-tight [&_li]:ml-5 [&_li]:list-disc [&_ul]:space-y-1.5 [&_a]:underline [&_a]:underline-offset-4">
          {children}
        </article>
      </main>
    </div>
  );
}
