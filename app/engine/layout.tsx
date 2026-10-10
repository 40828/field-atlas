import type { Metadata } from "next";

export const metadata: Metadata = {
  title: { default: "Autonomous Money Engine", template: "%s · AME" },
  description:
    "An operations desk that researches lawful income experiments, ranks strategies, and executes authorised work. It does not promise profit.",
};

export default function EngineRootLayout({ children }: { children: React.ReactNode }) {
  return <div className="ame min-h-dvh bg-background text-foreground">{children}</div>;
}
