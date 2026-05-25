// AI provider abstraction. Everything in the app talks to this interface, so
// swapping Gemini for Claude later is a single new adapter + one line in
// getAIProvider().

export interface AIProvider {
  readonly name: string;
  /** Returns model output as parsed JSON. */
  generateJSON<T>(systemPrompt: string, userPrompt: string): Promise<T>;
  /** Returns model output as plain text. */
  generateText(systemPrompt: string, userPrompt: string): Promise<string>;
}

export type RecommendationArea =
  | "training"
  | "nutrition"
  | "recovery"
  | "supplementation"
  | "general";

export interface CoachRecommendation {
  area: RecommendationArea;
  suggestion: string;
}

export interface CoachReview {
  summary: string;
  wins: string[];
  concerns: string[];
  recommendations: CoachRecommendation[];
}
