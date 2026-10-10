import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { AppShell } from "@/components/solar/app-shell";
import { TooltipProvider } from "@/components/ui/tooltip";

export const metadata: Metadata = {
  title: { default: "Dashboard", template: "%s · Voltline" },
};

/**
 * Persistent dashboard chrome: collapsible sidebar, topbar, theme switch.
 * Every route under /dashboard renders inside this shell, and is protected by `proxy.ts`.
 * ClerkProvider lives here (not in the root layout) so the marketing site and Field Atlas
 * never load the auth SDK.
 */
export default function DashboardLayout({ children }: LayoutProps<"/dashboard">) {
  return (
    <ClerkProvider>
      <TooltipProvider delayDuration={150}>
        <AppShell>{children}</AppShell>
      </TooltipProvider>
    </ClerkProvider>
  );
}
