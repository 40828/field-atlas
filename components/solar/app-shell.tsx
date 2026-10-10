"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense, useState, useSyncExternalStore, type ReactNode } from "react";
import { Dialog as DialogPrimitive } from "radix-ui";
import {
  Boxes,
  CreditCard,
  ChevronRight,
  FilePlus2,
  LayoutDashboard,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  Plug,
  Settings,
  X,
  type LucideIcon,
} from "lucide-react";
import { UserButton } from "@clerk/nextjs";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { BrandMark, BrandWordmark } from "./brand";
import { ThemeToggle } from "./theme-toggle";

/* ───────────────────────────── Navigation model ────────────────────────── */

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Exact-match only (used for the overview route). */
  exact?: boolean;
  disabled?: boolean;
}

const WORKSPACE_NAV: NavItem[] = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard, exact: true },
  { href: "/dashboard/upload", label: "New Proposal", icon: FilePlus2 },
  { href: "/dashboard/billing", label: "Billing", icon: CreditCard },
];

const SOON_NAV: NavItem[] = [
  { href: "#", label: "Materials Catalog", icon: Boxes, disabled: true },
  { href: "#", label: "CRM Integrations", icon: Plug, disabled: true },
  { href: "#", label: "Settings", icon: Settings, disabled: true },
];

/* ─────────────────────── Persisted sidebar collapse state ──────────────── */

const STORAGE_KEY = "voltline:sidebar-collapsed";
const listeners = new Set<() => void>();

function subscribeCollapsed(cb: () => void) {
  listeners.add(cb);
  window.addEventListener("storage", cb);
  return () => {
    listeners.delete(cb);
    window.removeEventListener("storage", cb);
  };
}
const getCollapsed = () => window.localStorage.getItem(STORAGE_KEY) === "1";
const getServerCollapsed = () => false;

function setCollapsed(next: boolean) {
  window.localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
  listeners.forEach((l) => l());
}

/* ─────────────────────────────────── Nav ───────────────────────────────── */

function NavLink({ item, collapsed, active, onNavigate }: {
  item: NavItem;
  collapsed: boolean;
  active: boolean;
  onNavigate?: () => void;
}) {
  const Icon = item.icon;
  const content = (
    <>
      <Icon className={cn("size-[18px] shrink-0 transition-colors", active && "text-brand")} />
      <span
        className={cn(
          "truncate transition-[opacity,width] duration-200",
          collapsed ? "w-0 opacity-0 lg:hidden" : "opacity-100",
        )}
      >
        {item.label}
      </span>
      {item.disabled && !collapsed && (
        <span className="ml-auto rounded bg-muted px-1.5 py-0.5 font-mono text-[9px] tracking-wider text-muted-foreground uppercase">
          Soon
        </span>
      )}
    </>
  );

  const base = cn(
    "group relative flex h-10 items-center gap-3 rounded-lg px-3 text-sm font-medium outline-none transition-colors focus-visible:ring-[3px] focus-visible:ring-ring",
    collapsed && "lg:justify-center lg:px-0",
  );

  const el = item.disabled ? (
    <span
      aria-disabled="true"
      className={cn(base, "cursor-not-allowed text-sidebar-foreground/40")}
    >
      {content}
    </span>
  ) : (
    <Link
      href={item.href}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      className={cn(
        base,
        active
          ? "bg-sidebar-accent text-sidebar-accent-foreground"
          : "text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground",
      )}
    >
      {active && (
        <span className="absolute top-2 bottom-2 left-0 w-[3px] rounded-r-full bg-primary" />
      )}
      {content}
    </Link>
  );

  if (!collapsed) return el;
  return (
    <Tooltip>
      <TooltipTrigger asChild>{el}</TooltipTrigger>
      <TooltipContent side="right" className="hidden lg:block">
        {item.label}
        {item.disabled ? " (coming soon)" : ""}
      </TooltipContent>
    </Tooltip>
  );
}

function isActive(pathname: string, item: NavItem) {
  if (item.disabled) return false;
  return item.exact ? pathname === item.href : pathname.startsWith(item.href);
}

/** Reads the pathname, so it must sit inside <Suspense> (Cache Components). */
function SidebarNav({ collapsed, onNavigate }: { collapsed: boolean; onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <NavGroups
      collapsed={collapsed}
      onNavigate={onNavigate}
      activeFor={(item) => isActive(pathname, item)}
    />
  );
}

function NavGroups({ collapsed, onNavigate, activeFor }: {
  collapsed: boolean;
  onNavigate?: () => void;
  activeFor: (item: NavItem) => boolean;
}) {
  return (
    <nav aria-label="Primary" className="flex flex-1 flex-col gap-6 overflow-y-auto px-3 py-4">
      <div className="flex flex-col gap-1">
        <p
          className={cn(
            "mb-1 px-3 font-mono text-[10px] tracking-[0.18em] text-muted-foreground uppercase",
            collapsed && "lg:hidden",
          )}
        >
          Workspace
        </p>
        {WORKSPACE_NAV.map((item) => (
          <NavLink key={item.label} item={item} collapsed={collapsed} active={activeFor(item)} onNavigate={onNavigate} />
        ))}
      </div>
      <div className="flex flex-col gap-1">
        <p
          className={cn(
            "mb-1 px-3 font-mono text-[10px] tracking-[0.18em] text-muted-foreground uppercase",
            collapsed && "lg:hidden",
          )}
        >
          Roadmap
        </p>
        {SOON_NAV.map((item) => (
          <NavLink key={item.label} item={item} collapsed={collapsed} active={false} />
        ))}
      </div>
    </nav>
  );
}

function SidebarBody({ collapsed, onNavigate }: { collapsed: boolean; onNavigate?: () => void }) {
  return (
    <div className="flex h-full flex-col">
      <div
        className={cn(
          "flex h-16 shrink-0 items-center gap-3 border-b border-sidebar-border px-4",
          collapsed && "lg:justify-center lg:px-0",
        )}
      >
        <BrandMark />
        <BrandWordmark className={cn(collapsed && "lg:hidden")} />
      </div>

      <Suspense
        fallback={<NavGroups collapsed={collapsed} onNavigate={onNavigate} activeFor={() => false} />}
      >
        <SidebarNav collapsed={collapsed} onNavigate={onNavigate} />
      </Suspense>

      <div className="shrink-0 border-t border-sidebar-border p-3">
        <div
          className={cn(
            "flex items-center gap-3 rounded-lg bg-sidebar-accent/40 p-2.5",
            collapsed && "lg:justify-center lg:bg-transparent lg:p-0",
          )}
        >
          <UserButton showName={!collapsed} appearance={{ elements: { rootBox: "min-w-0" } }} />
        </div>
      </div>
    </div>
  );
}

/* ───────────────────────────────── Breadcrumb ──────────────────────────── */

function Breadcrumb() {
  const pathname = usePathname();
  const parts = pathname.split("/").filter(Boolean);
  const crumbs = parts.map((part, i) => {
    const href = "/" + parts.slice(0, i + 1).join("/");
    const label =
      part === "dashboard" ? "Dashboard"
      : part === "upload" ? "New Proposal"
      : part === "billing" ? "Billing"
      : part === "proposals" ? "Proposals"
      : part.toUpperCase();
    return { href, label, last: i === parts.length - 1 };
  }).filter((c) => c.label !== "Proposals"); // /dashboard/proposals has no index page

  return (
    <ol className="flex min-w-0 items-center gap-1.5 text-sm">
      {crumbs.map((c, i) => (
        <li key={c.href} className="flex min-w-0 items-center gap-1.5">
          {i > 0 && <ChevronRight className="size-3.5 shrink-0 text-muted-foreground/60" />}
          {c.last ? (
            <span className="truncate font-medium" aria-current="page">{c.label}</span>
          ) : (
            <Link href={c.href} className="truncate text-muted-foreground transition-colors hover:text-foreground">
              {c.label}
            </Link>
          )}
        </li>
      ))}
    </ol>
  );
}

/* ──────────────────────────────────── Shell ────────────────────────────── */

export function AppShell({ children }: { children: ReactNode }) {
  const collapsed = useSyncExternalStore(subscribeCollapsed, getCollapsed, getServerCollapsed);
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex min-h-dvh bg-background">
      {/* Desktop sidebar */}
      <aside
        aria-label="Sidebar"
        className={cn(
          "sticky top-0 hidden h-dvh shrink-0 border-r border-sidebar-border bg-sidebar transition-[width] duration-300 ease-[cubic-bezier(0.2,0.8,0.2,1)] lg:block print:hidden",
          collapsed ? "w-[4.5rem]" : "w-64",
        )}
      >
        <SidebarBody collapsed={collapsed} />
      </aside>

      {/* Mobile drawer */}
      <DialogPrimitive.Root open={mobileOpen} onOpenChange={setMobileOpen}>
        <DialogPrimitive.Portal>
          <DialogPrimitive.Overlay className="fixed inset-0 z-40 bg-black/60 backdrop-blur-[2px] data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0 lg:hidden" />
          <DialogPrimitive.Content
            aria-describedby={undefined}
            className="fixed inset-y-0 left-0 z-50 w-72 max-w-[85vw] border-r border-sidebar-border bg-sidebar shadow-2xl duration-300 data-[state=closed]:animate-out data-[state=closed]:slide-out-to-left data-[state=open]:animate-in data-[state=open]:slide-in-from-left lg:hidden"
          >
            <DialogPrimitive.Title className="sr-only">Navigation</DialogPrimitive.Title>
            <DialogPrimitive.Close asChild>
              <Button variant="ghost" size="icon-sm" className="absolute top-4 right-3 z-10" aria-label="Close navigation">
                <X />
              </Button>
            </DialogPrimitive.Close>
            <SidebarBody collapsed={false} onNavigate={() => setMobileOpen(false)} />
          </DialogPrimitive.Content>
        </DialogPrimitive.Portal>
      </DialogPrimitive.Root>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center gap-2 border-b border-border bg-background/80 px-4 backdrop-blur-md sm:px-6 print:hidden">
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            aria-label="Open navigation"
            onClick={() => setMobileOpen(true)}
          >
            <Menu />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="hidden lg:inline-flex"
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            aria-pressed={collapsed}
            onClick={() => setCollapsed(!collapsed)}
          >
            {collapsed ? <PanelLeftOpen /> : <PanelLeftClose />}
          </Button>

          <div className="mx-1 hidden h-5 w-px bg-border sm:block" />
          <div className="min-w-0 flex-1">
            <Suspense fallback={<span className="text-sm text-muted-foreground">Dashboard</span>}>
              <Breadcrumb />
            </Suspense>
          </div>

          <Button asChild size="sm" className="hidden sm:inline-flex">
            <Link href="/dashboard/upload">
              <FilePlus2 />
              New proposal
            </Link>
          </Button>
          <ThemeToggle />
        </header>

        <main id="main" className="relative flex-1">
          {children}
        </main>
      </div>
    </div>
  );
}
