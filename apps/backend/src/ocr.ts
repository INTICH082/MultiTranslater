import { createGoogleVisionOcr, type OcrProvider } from "@multitranslate/core";
import { env } from "./env.js";

export function buildOcrProvider(): OcrProvider | null {
  if (!env.GOOGLE_VISION_API_KEY) return null;
  return createGoogleVisionOcr(env.GOOGLE_VISION_API_KEY);
}