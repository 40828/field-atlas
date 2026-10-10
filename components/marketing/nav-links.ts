export interface NavLink {
  href: string;
  label: string;
}

/** In-page anchors on the /solar marketing page. */
export const NAV_LINKS: readonly NavLink[] = [
  { href: "#how-it-works", label: "How it works" },
  { href: "#features", label: "Features" },
  { href: "#preview", label: "Product" },
  { href: "#pricing", label: "Pricing" },
  { href: "#faq", label: "FAQ" },
];
