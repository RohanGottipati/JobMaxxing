import "server-only";

import { GoogleGenAI } from "@google/genai";
import { z } from "zod";

export function isGeminiConfigured() {
  return Boolean(process.env.GEMINI_API_KEY?.trim());
}

export function getGeminiModel() {
  return process.env.GEMINI_MODEL?.trim() || "gemini-2.5-flash";
}

export async function generateValidatedJson<T>(input: {
  schema: z.ZodType<T>;
  system: string;
  prompt: string;
  timeoutMs?: number;
}) {
  const key = process.env.GEMINI_API_KEY?.trim();
  if (!key) throw new Error("AI_UNAVAILABLE");
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), input.timeoutMs ?? 45_000);
  try {
    const ai = new GoogleGenAI({ apiKey: key });
    const response = await ai.models.generateContent({
      model: getGeminiModel(),
      contents: input.prompt,
      config: {
        systemInstruction: input.system,
        temperature: 0.1,
        maxOutputTokens: 8_192,
        responseMimeType: "application/json",
        responseJsonSchema: z.toJSONSchema(input.schema),
        abortSignal: controller.signal,
      },
    });
    if (!response.text) throw new Error("AI_EMPTY_RESPONSE");
    return input.schema.parse(JSON.parse(response.text));
  } finally {
    clearTimeout(timeout);
  }
}

