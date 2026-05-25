import { GoogleGenAI } from "@google/genai";
import type { AIProvider } from "./types";

const MODEL = "gemini-2.5-flash";

// Gemini adapter. Free tier: 1,500 req/day, 15 RPM, no card. See plan section 3.
export class GeminiProvider implements AIProvider {
  readonly name = "gemini-2.5-flash";
  private client: GoogleGenAI;

  constructor(apiKey: string) {
    this.client = new GoogleGenAI({ apiKey });
  }

  async generateJSON<T>(
    systemPrompt: string,
    userPrompt: string,
    schema?: unknown,
  ): Promise<T> {
    const res = await this.client.models.generateContent({
      model: MODEL,
      contents: userPrompt,
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: "application/json",
        // A response schema makes Gemini emit guaranteed well-formed JSON.
        ...(schema ? { responseSchema: schema } : {}),
        temperature: 0.4,
      },
    });
    return parseJsonLoose<T>(res.text ?? "");
  }

  async generateText(systemPrompt: string, userPrompt: string): Promise<string> {
    const res = await this.client.models.generateContent({
      model: MODEL,
      contents: userPrompt,
      config: { systemInstruction: systemPrompt, temperature: 0.5 },
    });
    return res.text ?? "";
  }
}

// Tolerant JSON parse: handles stray code fences and trailing commas that
// models occasionally emit even in JSON mode.
function parseJsonLoose<T>(text: string): T {
  const tryParse = (s: string): T | undefined => {
    try {
      return JSON.parse(s) as T;
    } catch {
      return undefined;
    }
  };

  let out = tryParse(text);
  if (out !== undefined) return out;

  let cleaned = text
    .replace(/^\s*```(?:json)?/i, "")
    .replace(/```\s*$/, "")
    .trim();
  // Remove trailing commas before } or ].
  cleaned = cleaned.replace(/,(\s*[}\]])/g, "$1");

  out = tryParse(cleaned);
  if (out !== undefined) return out;

  throw new Error("Model returned unparseable JSON");
}
