import type { BlueprintFileInput, SiteMetadataInput } from "@/lib/solar/schemas";
import type { BlueprintAnalysis } from "@/lib/solar/types";

/** Lifecycle of the file inside step 1. */
export type UploadPhase = "idle" | "uploading" | "analyzing" | "done" | "error";

/** Everything the wizard needs to remember about the chosen file. */
export type UploadedFile = BlueprintFileInput; // validated client-side; the server re-reads the stored file

/** Form values are strings/empty until the user fills them in. */
export interface FormValues {
  clientName: string;
  address: string;
  buildingType: SiteMetadataInput["buildingType"] | "";
  material: SiteMetadataInput["material"] | "";
  jurisdiction: string;
  zoningCode: string;
}

export const EMPTY_FORM: FormValues = {
  clientName: "",
  address: "",
  buildingType: "",
  material: "",
  jurisdiction: "",
  zoningCode: "",
};

export type FieldName = keyof FormValues;
export type FieldErrors = Partial<Record<FieldName, string>>;

export interface WizardAnalysis {
  file: UploadedFile;
  result: BlueprintAnalysis;
}

export const WIZARD_STEPS = [
  { id: 1, title: "Blueprint", caption: "Upload & analyze" },
  { id: 2, title: "Site details", caption: "Parameters" },
  { id: 3, title: "Review", caption: "Generate proposal" },
] as const;

export const ANALYSIS_STAGES = [
  { label: "Verifying the PDF", detail: "Checking the file signature and size" },
  { label: "Reading the sheets", detail: "Sending the plan set to the vision model" },
  { label: "Measuring the roof", detail: "Using the drawing scale and dimension strings" },
  { label: "Counting penetrations", detail: "RTUs, vents, drains and skylights" },
  { label: "Capturing stated design values", detail: "Wind, snow and framing, only if the plans state them" },
] as const;
