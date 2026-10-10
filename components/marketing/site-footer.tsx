import Link from "next/link";
import { BrandMark, BrandWordmark } from "@/components/solar/brand";
import { NAV_LINKS } from "./nav-links";

export function SiteFooter() {
  return (
    <footer className="border-t border-border px-4 py-12 sm:px-6">
      <div className="mx-auto grid w-full max-w-6xl gap-10 md:grid-cols-[1.5fr_1fr_1fr]">
        <div>
          <div className="flex items-center gap-3">
            <BrandMark />
            <BrandWordmark />
          </div>
          <p className="mt-4 max-w-xs text-sm leading-relaxed text-muted-foreground">
            The blueprint-to-proposal engine for commercial solar and roofing contractors.
          </p>
        </div>

        <nav aria-label="Footer" className="text-sm">
          <p className="font-medium">Product</p>
          <ul className="mt-3 space-y-2 text-muted-foreground">
            {NAV_LINKS.map((l) => (
              <li key={l.href}>
                <a href={l.href} className="transition-colors hover:text-foreground">
                  {l.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <nav aria-label="App" className="text-sm">
          <p className="font-medium">App</p>
          <ul className="mt-3 space-y-2 text-muted-foreground">
            <li>
              <Link href="/sign-in" className="transition-colors hover:text-foreground">
                Sign in
              </Link>
            </li>
            <li>
              <Link href="/sign-up" className="transition-colors hover:text-foreground">
                Create account
              </Link>
            </li>
            <li>
              <Link href="/terms" className="transition-colors hover:text-foreground">
                Terms of Service
              </Link>
            </li>
            <li>
              <Link href="/privacy" className="transition-colors hover:text-foreground">
                Privacy Policy
              </Link>
            </li>
          </ul>
        </nav>
      </div>

      <div className="mx-auto mt-10 flex w-full max-w-6xl flex-col gap-2 border-t border-border pt-6 text-xs text-muted-foreground sm:flex-row sm:justify-between">
        {/* No `new Date()` here: with Cache Components it would opt this static page out of prerendering. */}
        <p>© Voltline. All rights reserved.</p>
        <p>Drafts only. Not engineering advice; verify all output with a licensed professional.</p>
      </div>
    </footer>
  );
}
