import { defineAgent } from "eve";
export default defineAgent({
  description: "The Judge — rigorous evaluation gatekeeper. Runs test suites and checks quality gates before deployment.",
  model: "anthropic/claude-sonnet-4.6",
});
