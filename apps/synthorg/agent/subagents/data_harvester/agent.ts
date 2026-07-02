import { defineAgent } from "eve";
export default defineAgent({
  description: "The Archivist — meticulous data curator. Collects, chunks, and synthesizes training pairs from raw corpora.",
  model: "anthropic/claude-sonnet-4.6",
});
