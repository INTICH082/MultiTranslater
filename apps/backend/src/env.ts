import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  PORT: z.string().default("8787"),
  ANTHROPIC_API_KEY: z.string().min(1, "ANTHROPIC_API_KEY обязателен для модуля анализа"),
  GOOGLE_TRANSLATE_API_KEY: z.string().optional(),
  GOOGLE_VISION_API_KEY: z.string().optional(),
  MICROSOFT_TRANSLATOR_KEY: z.string().optional(),
  MICROSOFT_TRANSLATOR_REGION: z.string().optional(),
  YANDEX_TRANSLATE_API_KEY: z.string().optional(),
  YANDEX_FOLDER_ID: z.string().optional(),
  ALLOWED_ORIGINS: z.string().default("*"),
});

export const env = envSchema.parse(process.env);