const FREE_MODELS = {
  "deepseek-v4-flash": "deepseek/deepseek-v4-flash",
  "qwen-3": "qwen/qwen3",
  "llama-4-scout": "meta-llama/llama-4-scout",
  "mistral-small-3.1": "mistralai/mistral-small-3.1",
} as const;

export function resolveModel(name?: string): string {
  if (name) return FREE_MODELS[name as keyof typeof FREE_MODELS] ?? name;
  return FREE_MODELS["deepseek-v4-flash"];
}

export function resolveFromEnv(name: string): string {
  const envKey = `SYNTH_MODEL_${name.toUpperCase()}`;
  if (typeof process !== "undefined" && process.env && process.env[envKey]) {
    return process.env[envKey]!;
  }
  return resolveModel();
}
