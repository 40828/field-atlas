"use client";

import type { ReactNode } from "react";
import { useAtlas } from "./atlas-provider";

/** Makes the whole app non-interactive (and hidden from AT) while the paywall is up. */
export function InertRoot({ children }: { children: ReactNode }) {
  const { paywallOpen } = useAtlas();
  return (
    <div inert={paywallOpen} aria-hidden={paywallOpen || undefined}>
      {children}
    </div>
  );
}
