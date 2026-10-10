import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Check, Radar, Shield, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/solar/theme-toggle";
import { EngineMark, EngineWordmark } from "@/components/engine/brand";
import { IncomeDisclaimer } from "@/components/engine/disclaimer";

export const metadata: Metadata = { title: "Autonomous Money Engine" };

const PILLARS = [
  {
    icon: Radar,
    title: "Research before building",
    body: "Retrieve public sources, label assumptions, and rank strategies on expected value, speed, capital and evidence — not the largest hypothetical upside.",
  },
  {
    icon: Shield,
    title: "Permissioned autonomy",
    body: "Research can run. Spend, deploy, publish and outreach wait for you. Agents cannot raise their own limits.",
  },
  {
    icon: Wallet,
    title: "Honest books",
    body: "Projected, invoiced and collected money are separate. Only attested or provider-verified collections count as profit.",
  },
];

export default function EngineLandingPage() {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="border-b border-border">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center gap-3 px-4 sm:px-6">
          <Link href="/engine" className="flex items-center gap-2.5">
            <EngineMark />
            <EngineWordmark className="hidden sm:inline" />
            <span className="font-semibold sm:hidden">AME</span>
          </Link>
          <nav className="ml-auto flex items-center gap-2">
            <Button asChild variant="ghost" size="sm">
              <Link href="/engine/setup">Setup</Link>
            </Button>
            <ThemeToggle />
            <Button asChild variant="outline" size="sm">
              <Link href="/sign-in?redirect_url=/engine/app">Sign in</Link>
            </Button>
            <Button asChild size="sm">
              <Link href="/sign-up?redirect_url=/engine/app">Get started</Link>
            </Button>
          </nav>
        </div>
      </header>

      <main className="flex-1">
        <section className="mx-auto grid w-full max-w-6xl gap-10 px-4 py-16 sm:px-6 lg:grid-cols-[1.2fr_0.8fr] lg:py-24">
          <div>
            <p className="font-mono text-[11px] tracking-[0.2em] text-primary uppercase">Operations desk</p>
            <h1 className="mt-3 text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
              An engine that works on lawful ways to make money — and tells you what it does not know.
            </h1>
            <p className="mt-5 max-w-xl text-lg text-pretty text-muted-foreground">
              Type “Go make me money.” The system researches, compares strategies, and runs a durable task queue.
              It will not invent customers, fake revenue, or spend without your approval.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild size="lg">
                <Link href="/sign-up?redirect_url=/engine/app">
                  Create an account
                  <ArrowRight />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link href="/engine/app">I already have an account</Link>
              </Button>
            </div>
            <IncomeDisclaimer className="mt-6 max-w-xl" />
          </div>
          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
            <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Default objective</p>
            <p className="mt-3 font-mono text-sm">Go make me money.</p>
            <p className="mt-4 text-sm text-muted-foreground">
              If you do not set a target, the engine uses an aspirational goal of $1,000,000 cumulative net profit.
              That is an objective for ranking work — not a forecast and not a guarantee.
            </p>
            <ul className="mt-6 space-y-2 text-sm">
              {[
                "Hacker News search is on with no key",
                "AI, database and Clerk must be configured",
                "Sandbox, deploy, Stripe and cron are optional",
                "Zero-capital mode is the default",
              ].map((item) => (
                <li key={item} className="flex gap-2">
                  <Check className="mt-0.5 size-4 shrink-0 text-primary" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="border-t border-border">
          <div className="mx-auto grid w-full max-w-6xl gap-6 px-4 py-16 sm:grid-cols-3 sm:px-6">
            {PILLARS.map(({ icon: Icon, title, body }) => (
              <div key={title} className="rounded-xl border border-border bg-card p-5">
                <Icon className="size-5 text-primary" />
                <h2 className="mt-3 font-semibold">{title}</h2>
                <p className="mt-2 text-sm text-muted-foreground">{body}</p>
              </div>
            ))}
          </div>
        </section>
      </main>

      <footer className="border-t border-border">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-3 px-4 py-8 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p>Autonomous Money Engine · not financial advice</p>
          <div className="flex gap-4">
            <Link href="/terms" className="hover:text-foreground">
              Terms
            </Link>
            <Link href="/privacy" className="hover:text-foreground">
              Privacy
            </Link>
            <Link href="/solar" className="hover:text-foreground">
              Voltline
            </Link>
            <Link href="/" className="hover:text-foreground">
              Field Atlas
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
