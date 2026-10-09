import type { ReactNode, Ref } from "react";
import { STRIPE_CHECKOUT_URL } from "@/lib/constants";

interface UpgradeLinkProps {
  className?: string;
  children: ReactNode;
  id?: string;
  ref?: Ref<HTMLAnchorElement>;
  "aria-label"?: string;
}

/**
 * Single source of truth for every upgrade action: opens the Stripe link in a
 * new browser tab. Use this instead of hand-rolling anchors.
 */
export function UpgradeLink({ className, children, ...rest }: UpgradeLinkProps) {
  return (
    <a
      href={STRIPE_CHECKOUT_URL}
      target="_blank"
      rel="noopener noreferrer"
      className={className}
      {...rest}
    >
      {children}
    </a>
  );
}
