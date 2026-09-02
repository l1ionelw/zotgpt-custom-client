// available chat models, keyed by the id sent as chatModelDeploymentName

export const MODELS = [
  // --- Anthropic ---
  { id: "us.anthropic.claude-opus-5", label: "Claude Opus 5", provider: "Anthropic", company: "Anthropic" },
  { id: "us.anthropic.claude-opus-4.8", label: "Claude Opus 4.8", provider: "Anthropic", company: "Anthropic" },
  { id: "us.anthropic.claude-opus-4.7", label: "Claude Opus 4.7", provider: "Anthropic", company: "Anthropic" },
  { id: "us.anthropic.claude-opus-4.6", label: "Claude Opus 4.6", provider: "Anthropic", company: "Anthropic" },
  { id: "us.anthropic.claude-opus-4.5", label: "Claude Opus 4.5", provider: "Anthropic", company: "Anthropic" },
  { id: "us.anthropic.claude-sonnet-5", label: "Claude Sonnet 5", provider: "Anthropic", company: "Anthropic" },
  { id: "us.anthropic.claude-sonnet-4.6", label: "Claude Sonnet 4.6", provider: "Anthropic", company: "Anthropic" },
  { id: "us.anthropic.claude-sonnet-4.5", label: "Claude Sonnet 4.5", provider: "Anthropic", company: "Anthropic" },
  { id: "us.anthropic.claude-haiku-4.5", label: "Claude Haiku 4.5", provider: "Anthropic", company: "Anthropic" },

  // --- OIT GPT ---
  { id: "oit-gpt-5.6-sol", label: "GPT-5.6 Sol", provider: "GPT", company: "OpenAI" },
  { id: "oit-gpt-5.6-terra", label: "GPT-5.6 Terra", provider: "GPT", company: "OpenAI" },
  { id: "oit-gpt-5.6-luna", label: "GPT-5.6 Luna", provider: "GPT", company: "OpenAI" },
  { id: "oit-gpt-5.5", label: "GPT-5.5", provider: "GPT", company: "OpenAI" },
  { id: "oit-gpt-5.4", label: "GPT-5.4", provider: "GPT", company: "OpenAI" },
  { id: "oit-gpt-5.4-mini", label: "GPT-5.4 Mini", provider: "GPT", company: "OpenAI" },
  { id: "oit-gpt-5.4-nano", label: "GPT-5.4 Nano", provider: "GPT", company: "OpenAI" },
  { id: "oit-gpt-5.2", label: "GPT-5.2", provider: "GPT", company: "OpenAI" },
  { id: "oit-gpt-5.1", label: "GPT-5.1", provider: "GPT", company: "OpenAI" },
  { id: "oit-gpt-5", label: "GPT-5", provider: "GPT", company: "OpenAI" },
  { id: "oit-gpt-5-mini", label: "GPT-5 Mini", provider: "GPT", company: "OpenAI" },
  { id: "oit-gpt-5-nano", label: "GPT-5 Nano", provider: "GPT", company: "OpenAI" },
  { id: "oit-gpt-4.1-mini", label: "GPT-4.1 Mini", provider: "GPT", company: "OpenAI" },
  { id: "oit-gpt-4.1-nano", label: "GPT-4.1 Nano", provider: "GPT", company: "OpenAI" },

  // --- Gemini ---
  { id: "gemini-3.7-flash", label: "Gemini 3.7 Flash", provider: "Gemini", company: "Google" },
  { id: "gemini-3.6-flash", label: "Gemini 3.6 Flash", provider: "Gemini", company: "Google" },
  { id: "gemini-3.5-flash", label: "Gemini 3.5 Flash", provider: "Gemini", company: "Google" },
  { id: "gemini-3.5-flash-lite", label: "Gemini 3.5 Flash-Lite", provider: "Gemini", company: "Google" },
  { id: "gemini-3.1-flash-lite", label: "Gemini 3.1 Flash-Lite", provider: "Gemini", company: "Google" },
  { id: "gemini-2.5-pro", label: "Gemini 2.5 Pro", provider: "Gemini", company: "Google" },
  { id: "gemini-2.5-flash", label: "Gemini 2.5 Flash", provider: "Gemini", company: "Google" },
  { id: "gemini-2.5-flash-lite", label: "Gemini 2.5 Flash-Lite", provider: "Gemini", company: "Google" },

  // --- Gemma ---
  { id: "google.gemma-4-31b", label: "Gemma 4 31B", provider: "Gemma", company: "Google" },
  { id: "google.gemma-4-26b-a4b", label: "Gemma 4 26B A4B", provider: "Gemma", company: "Google" },
  { id: "google.gemma-4-e2b", label: "Gemma 4 E2B", provider: "Gemma", company: "Google" },

  // --- Other ---
  { id: "us.deepseek.r1-v1:0", label: "DeepSeek R1", provider: "Other", company: "DeepSeek" },
  { id: "moonshotai.kimi-k2.5", label: "Kimi K2.5", provider: "Other", company: "Moonshot AI" },
];

export const DEFAULT_MODEL_ID = "us.anthropic.claude-sonnet-5";

export function getModel(modelId) {
  return MODELS.find((m) => m.id === modelId);
}
