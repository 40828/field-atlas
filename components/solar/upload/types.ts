import type { BlueprintFileInput, SiteMetadataInput } from "@/lib/solar/schemas";
import type { BlueprintAnalysis } from "@/lib/solar/types";

/** Lifecycle of the file inside step 1. */
export type UploadPhase = "idle" | "uploading" | "analyzing" | "done" | "error";

/** Everything the wizard needs to remember about the chosen file. */
export type UploadedFile = BlueprintFileInput;

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
  { label: "Validating PDF structure", detail: "Checking signatures, encryption and page tree" },
  { label: "Rasterizing sheets", detail: "Rendering roof plans at 300 DPI" },
  { label: "Detecting roof planes", detail: "Segmenting planes, ridges and valleys" },
  { label: "Measuring dimensions", detail: "Reading scale bars and dimension strings" },
  { label: "Locating penetrations", detail: "Finding RTUs, vents, drains and skylights" },
  { label: "Running preliminary load checks", detail: "Estimating dead-load reserve per bay" },
] as const;
