import { GoogleGenerativeAI } from "@google/generative-ai";

export function getGeminiClient() {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("GEMINI_API_KEY is not configured");
  return new GoogleGenerativeAI(key);
}

// Keep receipt extraction and settlement explanation prompts here.
// The settlement engine should calculate money; Gemini should explain it.
