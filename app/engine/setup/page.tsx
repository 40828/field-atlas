import type { Metadata } from "next";
import Link from "next/link";
import { EngineMark, EngineWordmark } from "@/components/engine/brand";
import { ThemeToggle } from "@/components/solar/theme-toggle";
import { integrationStatuses } from "@/lib/engine/config";

export const metadata: Metadata = { title: "Setup" };

export default function PublicSetupPage() {
  const items = integrationStatuses();
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6">
      <div className="mb-8 flex items-center gap-3">
        <Link href="/engine" className="flex items-center gap-2">
          <EngineMark />
          <EngineWordmark className="hidden sm:inline" />
        </Link>
        <div className="ml-auto">
          <ThemeToggle />
        </div>
      </div>
      <h1 className="text-3xl font-semibold tracking-tight">Setup</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Environment variable names only. Values are never shown. Add them to .env.local and your Vercel project.
      </p>
      <ol className="mt-8 space-y-4">
        {items.map((i, idx) => (
          <li key={i.id} className="rounded-xl border border-border p-4">
            <p className="text-xs text-muted-foreground">Step {idx + 1}</p>
            <h2 className="font-medium">
              {i.name} {i.configured ? "· ready" : i.required ? "· required" : "· optional"}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">{i.what}</p>
            <p className="mt-2 text-sm">{i.howToConfigure}</p>
            {i.env.length ? <p className="mt-1 font-mono text-xs">{i.env.join(" · ")}</p> : null}
            <p className="mt-1 text-xs text-muted-foreground">{i.cost}</p>
          </li>
        ))}
      </ol>
    </div>
  );
}
