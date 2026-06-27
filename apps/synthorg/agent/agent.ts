import { defineAgent } from "eve";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";

/**
 * Chief of Staff — Director-Agent at the root of the synthetic organization.
 *
 * MODEL STRATEGY: free / open / local-first.
 * - Set SYNTH_LOCAL_LLM_BASE_URL (e.g. http://localhost:11434/v1 for Ollama) to run agents
 *   on a local open-weights model at zero marginal cost. Default local model: Qwen3
 *   (strong agentic tool-use, runs on a single GPU). Override with SYNTH_AGENT_MODEL.
 * - Leave it unset to route through Vercel AI Gateway (SYNTH_AGENT_MODEL = a gateway id).
 * - Kimi K2.x is open-weights but ~1T params (32B active) — use it via a hosted/served
 *   endpoint (vLLM/SGLang/Ollama cloud), not a workstation. Point SYNTH_LOCAL_LLM_BASE_URL
 *   at that endpoint to use it through the same path.
 *
 * Workers (subagents) can run a smaller/cheaper local model than the director; see handoff.
 */
const localBase = process.env.SYNTH_LOCAL_LLM_BASE_URL;
const modelId = process.env.SYNTH_AGENT_MODEL ?? (localBase ? "qwen3" : "anthropic/claude-sonnet-4.6");

const model = localBase
  ? createOpenAICompatible({
      name: "local",
      baseURL: localBase,
      apiKey: process.env.SYNTH_LOCAL_LLM_API_KEY ?? "ollama",
    })(modelId)
  : modelId;

export default defineAgent({ model });
