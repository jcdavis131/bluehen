import { defineAgent } from "eve";
export default defineAgent({
  description: "The Grounder — pragmatic deployment engineer. Promotes models to production and monitors for drift.",
  model: "anthropic/claude-sonnet-4.6",
});
