"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, Menu, X } from "lucide-react";
import { BrandMark, BrandWordmark } from "@/components/solar/brand";
import { ThemeToggle } from "@/components/solar/theme-toggle";
import { Button } from "@/components/ui/button";
import { NAV_LINKS } from "./nav-links";

/** Sticky, blurred marketing header with a disclosure menu on small screens. */
export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <header
      data-scrolled={scrolled}
      className="sticky top-0 z-40 border-b border-transparent transition-[background-color,border-color,backdrop-filter] duration-300 data-[scrolled=true]:border-border data-[scrolled=true]:bg-background/80 data-[scrolled=true]:backdrop-blur-xl"
    >
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center gap-4 px-4 sm:px-6">
        <Link href="/solar" className="flex items-center gap-3" aria-label="Voltline home">
          <BrandMark />
          <BrandWordmark className="hidden sm:flex" />
        </Link>

        <nav aria-label="Primary" className="ml-6 hidden items-center gap-1 lg:flex">
          {NAV_LINKS.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              {l.label}
            </a>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <ThemeToggle />
          <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex">
            <Link href="/sign-in">Sign in</Link>
          </Button>
          <Button asChild size="sm" className="hidden sm:inline-flex">
            <Link href="/sign-up">
              Start free <ArrowRight />
            </Link>
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            aria-controls="mobile-menu"
            onClick={() => setOpen((v) => !v)}
          >
            {open ? <X /> : <Menu />}
          </Button>
        </div>
      </div>

      {open && (
        <div
          id="mobile-menu"
          className="border-b border-border bg-background/95 px-4 pb-5 backdrop-blur-xl lg:hidden"
        >
          <nav aria-label="Mobile" className="mx-auto flex max-w-6xl flex-col py-2">
            {NAV_LINKS.map((l) => (
              <a
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className="rounded-md px-2 py-3 text-[15px] text-foreground transition-colors hover:bg-accent"
              >
                {l.label}
              </a>
            ))}
          </nav>
          <div className="mx-auto flex max-w-6xl gap-2 pt-2">
            <Button asChild variant="outline" className="flex-1">
              <Link href="/sign-in">Sign in</Link>
            </Button>
            <Button asChild className="flex-1">
              <Link href="/sign-up">Start free</Link>
            </Button>
          </div>
        </div>
      )}
    </header>
  );
}
