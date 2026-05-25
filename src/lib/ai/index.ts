import { GeminiProvider } from "./gemini";
import type { AIProvider } from "./types";

// Single place that picks the AI backend. Swap to a Claude adapter here later
// with no changes anywhere else. Returns null if no key is configured.
export function getAIProvider(): AIProvider | null {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return null;
  return new GeminiProvider(key);
}

export function isAIConfigured(): boolean {
  return Boolean(process.env.GEMINI_API_KEY);
}
