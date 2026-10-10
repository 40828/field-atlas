import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export function CtaBand() {
  return (
    <section className="px-4 pb-20 sm:px-6 sm:pb-28">
      <div className="relative mx-auto w-full max-w-6xl overflow-hidden rounded-3xl border border-primary/30 bg-card px-6 py-16 text-center sm:px-12">
        <div className="bg-blueprint pointer-events-none absolute inset-0 opacity-60" />
        <div className="pointer-events-none absolute -bottom-24 left-1/2 size-80 -translate-x-1/2 rounded-full bg-primary/20 blur-[100px]" />
        <div className="relative">
          <h2 className="mx-auto max-w-2xl text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
            Win more bids by sending them <span className="text-gradient-amber">first</span>.
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-pretty text-muted-foreground">
            Upload the plan from your next job and see a complete draft proposal in minutes.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button asChild size="lg" className="glow-amber">
              <Link href="/sign-up">
                Try 2 proposals free <ArrowRight />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href="/sign-in">Sign in</Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
