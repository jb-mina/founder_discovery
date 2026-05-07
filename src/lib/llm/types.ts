// Vendor-agnostic LLM call interface for Reality Check personas.
// Anthropic models go through the native @anthropic-ai/sdk; everything else
// (OpenAI / Google / Perplexity) goes through OpenRouter's OpenAI-compatible
// API. The 9 other agents in this codebase keep using Anthropic native
// directly — only RC uses this router.

export type Vendor = "anthropic" | "openrouter";

export type PersonaKey = "investor" | "friend" | "socratic" | "moderator";

export type ModelPreset = {
  vendor: Vendor;
  // Anthropic native: short ID (e.g. "claude-sonnet-4-6").
  // OpenRouter: namespaced ID (e.g. "openai/gpt-5.1", "google/gemini-3-flash",
  // "perplexity/sonar-pro").
  model: string;
  label: string;
};

export type ToolSpec = {
  name: string;
  description: string;
  // JSON Schema. Anthropic accepts as `input_schema`; OpenAI-compatible
  // (OpenRouter) accepts as `function.parameters`. Same shape works for both.
  inputSchema: Record<string, unknown>;
};

export type CallToolArgs = {
  vendor: Vendor;
  model: string;
  system: string;
  userMessage: string;
  temperature: number;
  maxTokens: number;
  tool: ToolSpec;
};

export type CallToolResult =
  | { ok: true; input: unknown }
  | { ok: false; error: string; raw?: unknown };

// Curated preset list. Surface in the settings UI; users pick one per persona.
// Adding a new model = append to this list. The vendor field tells the router
// which transport to use.
export const MODEL_PRESETS: ModelPreset[] = [
  // Anthropic native
  { vendor: "anthropic", model: "claude-sonnet-4-6", label: "Claude Sonnet 4.6 (Anthropic)" },
  { vendor: "anthropic", model: "claude-opus-4-7", label: "Claude Opus 4.7 (Anthropic)" },
  // OpenAI via OpenRouter
  { vendor: "openrouter", model: "openai/gpt-5.1", label: "GPT-5.1 (OpenAI)" },
  { vendor: "openrouter", model: "openai/gpt-5", label: "GPT-5 (OpenAI)" },
  // Google via OpenRouter
  { vendor: "openrouter", model: "google/gemini-3-flash", label: "Gemini 3 Flash (Google)" },
  { vendor: "openrouter", model: "google/gemini-2.5-pro", label: "Gemini 2.5 Pro (Google)" },
  // Perplexity via OpenRouter
  { vendor: "openrouter", model: "perplexity/sonar-pro", label: "Perplexity Sonar Pro" },
];

// Default mapping per persona (decided 2026-05-07).
export const DEFAULT_PERSONA_MODELS: Record<PersonaKey, { vendor: Vendor; model: string }> = {
  investor: { vendor: "openrouter", model: "perplexity/sonar-pro" },
  friend: { vendor: "openrouter", model: "openai/gpt-5.1" },
  socratic: { vendor: "openrouter", model: "google/gemini-3-flash" },
  moderator: { vendor: "anthropic", model: "claude-sonnet-4-6" },
};

// Final-safety-net fallback when the user's chosen vendor errors. Anthropic
// Sonnet is the default since the API key is already configured for the
// other 9 agents in this codebase, so it's the most reliable backstop.
export const ULTIMATE_FALLBACK: { vendor: Vendor; model: string } = {
  vendor: "anthropic",
  model: "claude-sonnet-4-6",
};
