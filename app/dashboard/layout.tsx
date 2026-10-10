import type { Metadata } from "next";
import { AppShell } from "@/components/solar/app-shell";
import { TooltipProvider } from "@/components/ui/tooltip";

export const metadata: Metadata = {
  title: { default: "Dashboard", template: "%s · Voltline" },
};

/**
 * Persistent dashboard chrome: collapsible sidebar, topbar, theme switch.
 * Every route under /dashboard renders inside this shell.
 */
export default function DashboardLayout({ children }: LayoutProps<"/dashboard">) {
  return (
    <TooltipProvider delayDuration={150}>
      <AppShell>{children}</AppShell>
    </TooltipProvider>
  );
}
