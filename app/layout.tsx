import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ThemeProvider } from "@/components/providers/theme-provider";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Voltline — Blueprint-to-Proposal Engine",
    template: "%s · Voltline",
  },
  description:
    "Turn commercial roof blueprints into draft proposals and a priced bill of materials in minutes. Built for solar and roofing contractors.",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fafafa" },
    { media: "(prefers-color-scheme: dark)", color: "#0d0f14" },
  ],
  viewportFit: "cover",
};

/**
 * Root layout: fonts, global CSS and the light/dark ThemeProvider.
 *
 * Route-specific chrome lives in nested layouts:
 *  - /dashboard/**  → app/dashboard/layout.tsx (collapsible sidebar shell)
 *  - /              → app/(atlas)/layout.tsx   (existing Field Atlas app)
 */
export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    // `suppressHydrationWarning`: next-themes sets the `dark`/`light` class on
    // <html> before hydration to avoid a flash of the wrong theme.
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full`}
    >
      <body className="min-h-full font-sans antialiased">
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
