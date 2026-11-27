import { GoogleGenAI } from "@google/genai";
import { SafetyClassificationSchema, type SafetyFlag } from "@/contracts";
import { SAFETY_CLASSIFIER_PROMPT } from "./prompts";

export const EMERGENCY_FIXED_REPLY =
  "If this is urgent, call 112 or go to the nearest hospital.";

export interface GeminiClientLike {
  generateJson(params: {
    systemInstruction: string;
    prompt: string;
    temperature?: number;
    maxOutputTokens?: number;
  }): Promise<string>;
}

export function createSdkGeminiClient(): GeminiClientLike | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;

  const ai = new GoogleGenAI({ apiKey });
  const model = process.env.GEMINI_MODEL ?? "gemini-2.5-flash";

  return {
    async generateJson({
      systemInstruction,
      prompt,
      temperature = 0.3,
      maxOutputTokens = 1024,
    }) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 20_000);
      try {
        const res = await ai.models.generateContent({
          model,
          contents: prompt,
          config: {
            systemInstruction,
            temperature,
            maxOutputTokens,
            responseMimeType: "application/json",
            abortSignal: controller.signal,
          },
        });
        return res.text ?? "{}";
      } finally {
        clearTimeout(timeout);
      }
    },
  };
}

export async function classifySafety(
  message: string,
  client?: GeminiClientLike | null
): Promise<SafetyFlag> {
  const activeClient = client === undefined ? createSdkGeminiClient() : client;
  if (!activeClient) {
    return "none";
  }

  try {
    const raw = await activeClient.generateJson({
      systemInstruction: SAFETY_CLASSIFIER_PROMPT,
      prompt: message,
      temperature: 0,
      maxOutputTokens: 64,
    });
    const parsed = SafetyClassificationSchema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data.flag : "none";
  } catch {
    return "none";
  }
}
