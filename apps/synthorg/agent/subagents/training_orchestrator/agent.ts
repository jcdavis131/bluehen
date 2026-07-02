import { defineAgent } from "eve";
export default defineAgent({
  description: "The Alchemist — experimental training recipe composer. Launches and monitors ASN fine-tuning runs.",
  model: "anthropic/claude-sonnet-4.6",
});
