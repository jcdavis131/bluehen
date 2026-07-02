export type RunStatus = "running" | "finished" | "failed" | string;

export interface RunManifest {
  id: string;
  project: string;
  name: string;
  config: Record<string, unknown>;
  tags: string[];
  status: RunStatus;
  summary: Record<string, number | string>;
  createdAt: string;
  updatedAt: string;
}

export interface MetricRow {
  step: number;
  ts: string;
  metrics: Record<string, number>;
}

export interface EventRow {
  ts: string;
  step: number;
  kind: string;
  message: string;
  data: Record<string, unknown>;
}

export interface Point {
  x: number;
  y: number;
}

export interface Series {
  label: string;
  color: string; // CSS custom property name, e.g. "--s1"
  points: Point[];
}

export interface ChartEvent {
  x: number;
  kind: string;
  label: string;
}
