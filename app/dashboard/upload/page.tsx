import type { Metadata } from "next";
import { UploadWizard } from "@/components/solar/upload/upload-wizard";

export const metadata: Metadata = { title: "New Proposal" };

/** Three-step wizard: blueprint upload → site metadata → review & generate. */
export default function UploadPage() {
  return (
    <div className="relative">
      <div className="bg-blueprint pointer-events-none absolute inset-x-0 top-0 h-72" aria-hidden />
      <div className="relative mx-auto flex w-full max-w-[1200px] flex-col gap-8 px-4 py-8 sm:px-6 lg:px-8">
        <header className="sp-fade-up">
          <p className="mb-2 font-mono text-[11px] tracking-[0.2em] text-brand uppercase">New proposal</p>
          <h1 className="text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
            From blueprint to bid in minutes
          </h1>
          <p className="mt-2 max-w-2xl text-pretty text-muted-foreground">
            Upload a PDF roof plan, tell us about the site, and we&apos;ll generate an engineered
            proposal with a fully itemized bill of materials.
          </p>
        </header>
        <UploadWizard />
      </div>
    </div>
  );
}
