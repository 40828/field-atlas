import type { Metadata } from "next";
import { LEGAL } from "@/lib/legal";

export const metadata: Metadata = { title: "Terms of Service" };

export default function TermsPage() {
  return (
    <>
      <h1>Terms of Service</h1>
      <p className="text-sm text-muted-foreground">Effective {LEGAL.effectiveDate}</p>

      <p>
        These terms govern your use of {LEGAL.product}, provided by {LEGAL.company} (&ldquo;we&rdquo;, &ldquo;us&rdquo;).
        By creating an account or using the service you agree to them.
      </p>

      <h2>1. The service</h2>
      <p>
        {LEGAL.product} reads roof plan PDFs you upload with an AI model and drafts a proposal, a bill of materials and
        a verification checklist. You can edit all output.
      </p>

      <h2>2. Not engineering advice</h2>
      <p>
        Output is a draft for your review. Measurements may be inaccurate, and unit costs are default assumptions.
        Code, structural, wind, snow, fire and zoning items are checklists only. {LEGAL.product} does not provide
        engineering, legal or permitting advice, and nothing it produces is a stamped or sealed document. You are
        responsible for verifying every quantity, price and compliance item with a licensed professional and the
        authority having jurisdiction before relying on it, submitting a permit or sending a bid.
      </p>

      <h2>3. Accounts</h2>
      <p>
        Keep your credentials secure. You are responsible for activity under your account and for the people you invite
        to your organization.
      </p>

      <h2>4. Your content</h2>
      <p>
        You keep ownership of the plans you upload and the proposals you create. You grant us a limited license to
        process them to provide the service, including sending plan files to our AI provider for analysis. You confirm
        you have the right to upload what you submit.
      </p>

      <h2>5. Plans, billing and trials</h2>
      <ul>
        <li>Paid plans are billed in advance, monthly or annually, through Stripe.</li>
        <li>New paid subscriptions start with a free trial. You will be charged when the trial ends unless you cancel first.</li>
        <li>Subscriptions renew automatically until canceled. You can cancel any time from the billing portal; access continues until the end of the paid period.</li>
        <li>Plan limits (such as proposals per period and analyses per day) apply as described on the pricing page.</li>
        <li>Fees are non-refundable except where required by law. Taxes may be added where applicable.</li>
      </ul>

      <h2>6. Acceptable use</h2>
      <p>
        Do not misuse the service: no unlawful content, no attempts to breach or overload it, no reselling access, and no
        uploading files you are not entitled to share.
      </p>

      <h2>7. Availability and changes</h2>
      <p>
        We work to keep the service available but do not guarantee uninterrupted operation. We may change features and
        pricing with notice, and may suspend accounts that breach these terms.
      </p>

      <h2>8. Disclaimer and limitation of liability</h2>
      <p>
        The service is provided &ldquo;as is&rdquo; without warranties of any kind. To the fullest extent permitted by
        law, we are not liable for indirect or consequential damages, lost profits, or losses arising from bids,
        installations, permits or construction decisions made using the output, and our total liability is limited to the
        amount you paid us in the 12 months before the claim.
      </p>

      <h2>9. Governing law</h2>
      <p>These terms are governed by the laws of {LEGAL.governingLaw}.</p>

      <h2>10. Contact</h2>
      <p>
        Questions: <a href={`mailto:${LEGAL.contactEmail}`}>{LEGAL.contactEmail}</a>
      </p>
    </>
  );
}
