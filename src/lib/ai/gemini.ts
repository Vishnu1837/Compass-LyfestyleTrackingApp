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

  async generateJSON<T>(systemPrompt: string, userPrompt: string): Promise<T> {
    const res = await this.client.models.generateContent({
      model: MODEL,
      contents: userPrompt,
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: "application/json",
        temperature: 0.4,
      },
    });
    const text = res.text ?? "";
    try {
      return JSON.parse(text) as T;
    } catch {
      // Strip accidental code fences if the model added them.
      const cleaned = text.replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
      return JSON.parse(cleaned) as T;
    }
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
