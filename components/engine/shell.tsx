"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";
import { UserButton } from "@clerk/nextjs";
import {
  Activity,
  Building2,
  CreditCard,
  FlaskConical,
  GitCompare,
  History,
  LayoutDashboard,
  LineChart,
  Menu,
  Megaphone,
  Package,
  Radar,
  Settings,
  Sparkles,
  Users,
  Wallet,
  X,
  type LucideIcon,
} from "lucide-react";
import { ThemeToggle } from "@/components/solar/theme-toggle";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { EngineMark } from "./brand";
import { TickPoller } from "./tick-poller";

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  exact?: boolean;
}

const NAV: NavItem[] = [
  { href: "/engine/app", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/engine/app/activity", label: "Activity", icon: Activity },
  { href: "/engine/app/opportunities", label: "Opportunities", icon: Radar },
  { href: "/engine/app/strategies", label: "Strategies", icon: GitCompare },
  { href: "/engine/app/experiments", label: "Experiments", icon: FlaskConical },
  { href: "/engine/app/studio", label: "Software studio", icon: Sparkles },
  { href: "/engine/app/marketing", label: "Marketing", icon: Megaphone },
  { href: "/engine/app/prospects", label: "Prospects", icon: Users },
  { href: "/engine/app/ledger", label: "Ledger", icon: Wallet },
  { href: "/engine/app/improve", label: "Improvements", icon: LineChart },
  { href: "/engine/app/catalog", label: "Catalog", icon: Package },
  { href: "/engine/app/history", label: "History", icon: History },
];

const META: NavItem[] = [
  { href: "/engine/app/billing", label: "Billing", icon: CreditCard },
  { href: "/engine/app/settings", label: "Integrations", icon: Settings },
  { href: "/engine/app/acquire", label: "Acquisitions", icon: Building2 },
];

function active(pathname: string, item: NavItem) {
  return item.exact ? pathname === item.href : pathname === item.href || pathname.startsWith(`${item.href}/`);
}

export function EngineShell({ children, running }: { children: ReactNode; running: boolean }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <div className="ame flex min-h-dvh bg-background text-foreground">
      {running ? <TickPoller /> : null}
      <aside className="hidden w-64 shrink-0 border-r border-sidebar-border bg-sidebar lg:flex lg:flex-col">
        <BrandLink />
        <nav className="flex flex-1 flex-col gap-6 overflow-y-auto px-3 py-4">
          <NavGroup items={NAV} pathname={pathname} />
          <NavGroup items={META} pathname={pathname} title="Account" />
        </nav>
        <p className="px-4 pb-4 text-[11px] leading-4 text-muted-foreground">
          An operations desk. Not a promise of profit.
        </p>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b border-border bg-background/80 px-4 backdrop-blur">
          <Button variant="ghost" size="icon-sm" className="lg:hidden" onClick={() => setOpen(true)} aria-label="Open menu">
            <Menu />
          </Button>
          <Link href="/engine" className="flex items-center gap-2 lg:hidden">
            <EngineMark className="size-7" />
            <span className="text-sm font-semibold">AME</span>
          </Link>
          <div className="ml-auto flex items-center gap-2">
            <Button asChild variant="outline" size="sm">
              <Link href="/engine/app/missions/new">New mission</Link>
            </Button>
            <ThemeToggle />
            <UserButton />
          </div>
        </header>
        <main className="mx-auto w-full max-w-[1200px] flex-1 px-4 py-8 sm:px-6">{children}</main>
      </div>

      {open ? (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button type="button" className="absolute inset-0 bg-black/50" aria-label="Close menu" onClick={() => setOpen(false)} />
          <div className="absolute inset-y-0 left-0 flex w-72 flex-col bg-sidebar shadow-xl">
            <div className="flex items-center justify-between px-3 py-3">
              <BrandLink />
              <Button variant="ghost" size="icon-sm" onClick={() => setOpen(false)} aria-label="Close menu">
                <X />
              </Button>
            </div>
            <nav className="flex flex-1 flex-col gap-6 overflow-y-auto px-3 py-2" onClick={() => setOpen(false)}>
              <NavGroup items={NAV} pathname={pathname} />
              <NavGroup items={META} pathname={pathname} title="Account" />
            </nav>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function BrandLink() {
  return (
    <Link href="/engine/app" className="flex items-center gap-2.5 px-4 py-4">
      <EngineMark className="size-8" />
      <div className="leading-tight">
        <div className="text-sm font-semibold">Money Engine</div>
        <div className="text-[11px] text-muted-foreground">Operations desk</div>
      </div>
    </Link>
  );
}

function NavGroup({ items, pathname, title }: { items: NavItem[]; pathname: string; title?: string }) {
  return (
    <div>
      {title ? <p className="mb-2 px-2 text-[11px] font-medium tracking-wider text-muted-foreground uppercase">{title}</p> : null}
      <ul className="space-y-0.5">
        {items.map((item) => {
          const Icon = item.icon;
          const on = active(pathname, item);
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                className={cn(
                  "flex items-center gap-2 rounded-lg px-2.5 py-2 text-sm transition-colors",
                  on ? "bg-sidebar-accent text-sidebar-accent-foreground" : "text-sidebar-foreground hover:bg-sidebar-accent/60",
                )}
              >
                <Icon className="size-4 shrink-0" />
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
