import type { FastifyInstance } from "fastify";
import { z } from "zod";
import type { OcrProvider, TranslationManager } from "@multitranslate/core";

const ocrTranslateBodySchema = z.object({
  imageBase64: z.string().min(1),
  sourceLang: z.string().default("auto"),
  targetLang: z.string().min(2),
  glossary: z.record(z.string(), z.string()).optional(),
});

export function registerOcrTranslateRoutes(
  app: FastifyInstance,
  manager: TranslationManager,
  ocr: OcrProvider | null
) {
  app.post("/api/ocr-translate", async (request, reply) => {
    if (!ocr) {
      return reply.status(503).send({
        error: "OCR не настроен: заполните GOOGLE_VISION_API_KEY в .env",
      });
    }

    const parsed = ocrTranslateBodySchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: parsed.error.flatten() });
    }

    try {
      const recognizedText = await ocr.recognize(parsed.data.imageBase64);

      if (!recognizedText) {
        return reply.status(200).send({
          recognizedText: "",
          translation: null,
          message: "Текст на изображении не распознан",
        });
      }

      const translation = await manager.translate({
        text: recognizedText,
        sourceLang: parsed.data.sourceLang,
        targetLang: parsed.data.targetLang,
        glossary: parsed.data.glossary,
      });

      return { recognizedText, translation };
    } catch (err) {
      request.log.error(err);
      return reply.status(502).send({
        error: err instanceof Error ? err.message : "Ошибка распознавания/перевода области экрана",
      });
    }
  });
}