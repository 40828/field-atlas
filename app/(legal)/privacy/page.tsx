import type { Metadata } from "next";
import { LEGAL } from "@/lib/legal";

export const metadata: Metadata = { title: "Privacy Policy" };

export default function PrivacyPage() {
  return (
    <>
      <h1>Privacy Policy</h1>
      <p className="text-sm text-muted-foreground">Effective {LEGAL.effectiveDate}</p>

      <p>
        This policy explains what {LEGAL.company} (&ldquo;we&rdquo;) collects when you use {LEGAL.product}, and how it is
        used.
      </p>

      <h2>What we collect</h2>
      <ul>
        <li>Account details (name, email, sign-in method) handled by our authentication provider, Clerk.</li>
        <li>Content you provide: roof plan PDFs, site details (client name, address, jurisdiction) and the proposals and bills of materials you create.</li>
        <li>Billing information. Card details go directly to Stripe; we store only your Stripe customer and subscription identifiers and plan status.</li>
        <li>Basic technical data such as logs and usage counts needed to run and secure the service.</li>
      </ul>

      <h2>How we use it</h2>
      <ul>
        <li>To provide the service: store your plans, analyze them and generate proposals.</li>
        <li>To bill you, enforce plan limits and prevent abuse.</li>
        <li>To support you and to improve reliability. We do not sell your data.</li>
      </ul>

      <h2>Who processes it</h2>
      <p>We use these service providers to operate {LEGAL.product}:</p>
      <ul>
        <li>Vercel: hosting, private file storage and AI gateway routing.</li>
        <li>An AI model provider reached through the Vercel AI Gateway: reads uploaded plan PDFs to produce measurements.</li>
        <li>Neon: database hosting for your proposals and account records.</li>
        <li>Clerk: authentication and organization management.</li>
        <li>Stripe: payments and subscription billing.</li>
      </ul>

      <h2>Retention and deletion</h2>
      <p>
        We keep your content while your account is active. To delete your account and associated plans and proposals,
        email <a href={`mailto:${LEGAL.contactEmail}`}>{LEGAL.contactEmail}</a>. Billing records may be retained as
        required by law.
      </p>

      <h2>Security</h2>
      <p>
        Plans are stored in a private store, and data is scoped to your account or organization. No system is perfectly
        secure; please use a strong sign-in method.
      </p>

      <h2>Your rights</h2>
      <p>
        Depending on where you live you may have rights to access, correct, export or delete your data. Contact us to
        exercise them.
      </p>

      <h2>Contact</h2>
      <p>
        <a href={`mailto:${LEGAL.contactEmail}`}>{LEGAL.contactEmail}</a>
      </p>
    </>
  );
}
