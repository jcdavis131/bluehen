/** Spec 0027 — Launchpad wizard state shape, shared between the client
 * component and its sessionStorage persistence. Field `type` values match
 * `FilterableField["type"]` in @synthaembed/ui-fleet 1:1 (minus "geo",
 * which the Describe step doesn't offer) so step 1's fields feed step 4's
 * FilterChips with no translation. */

export type FieldType = "keyword" | "number" | "date";

export type FieldDef = {
  name: string;
  type: FieldType;
};

export type WizardStepId = "describe" | "upload" | "train" | "try";

export const WIZARD_STEPS: { id: WizardStepId; label: string }[] = [
  { id: "describe", label: "Describe" },
  { id: "upload", label: "Upload" },
  { id: "train", label: "Train" },
  { id: "try", label: "Try" },
];

export type TrainStatus = {
  jobId: string;
  status: string;
  modelVersion?: string | null;
  effectiveRank?: number | null;
  error?: string | null;
};

export type Recommendation = {
  id: string;
  title: string;
  score: number;
  reason: string;
  url?: string | null;
};

export type WizardState = {
  step: WizardStepId;
  datasetName: string;
  fields: FieldDef[];
  contractSaved: boolean;
  rawText: string;
  documents: { text: string }[];
  jobId: string | null;
  lastStatus: TrainStatus | null;
  filters: Record<string, unknown>;
  query: string;
  results: Recommendation[] | null;
};

export const INITIAL_STATE: WizardState = {
  step: "describe",
  datasetName: "",
  fields: [{ name: "", type: "keyword" }],
  contractSaved: false,
  rawText: "",
  documents: [],
  jobId: null,
  lastStatus: null,
  filters: {},
  query: "",
  results: null,
};

export const STORAGE_KEY = "bh-launchpad-v1";

export const MAX_DOCS = 50;
export const MAX_TOTAL_BYTES = 200_000;
