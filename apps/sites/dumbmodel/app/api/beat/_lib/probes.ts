/**
 * Beat the Baseline probe topics (Spec 0031 §2 GAME-001): a small
 * server-side list used only to pull a random real chunk from the
 * research index for the anchor. Not shown to the player — the anchor
 * card shows the chunk's own title + snippet, not the probe that found it.
 */
export const ANCHOR_PROBES: string[] = [
  "contrastive learning",
  "retrieval benchmarks",
  "transformer architectures",
  "instruction tuning",
  "vector quantization",
  "knowledge distillation",
  "graph neural networks",
  "reinforcement learning from human feedback",
  "diffusion models",
  "sparse attention",
  "multi-task learning",
  "embedding calibration",
];

export function randomProbe(): string {
  return ANCHOR_PROBES[Math.floor(Math.random() * ANCHOR_PROBES.length)];
}
