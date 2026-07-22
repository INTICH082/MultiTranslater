import type { FastifyInstance } from "fastify";
import { z } from "zod";
import type { TranslationManager } from "@multitranslate/core";

const translateBodySchema = z.object({
  text: z.string().min(1).max(5000),
  sourceLang: z.string().default("auto"),
  targetLang: z.string().min(2),
  providers: z.array(z.string()).optional(),
  glossary: z.record(z.string()).optional(),
});

export function registerTranslateRoutes(app: FastifyInstance, manager: TranslationManager) {
  app.get("/api/providers", async () => {
    return { providers: manager.listProviders() };
  });

  app.post("/api/translate", async (request, reply) => {
    const parsed = translateBodySchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: parsed.error.flatten() });
    }

    try {
      const result = await manager.translate(parsed.data);
      return result;
    } catch (err) {
      request.log.error(err);
      return reply.status(502).send({
        error: err instanceof Error ? err.message : "Неизвестная ошибка перевода",
      });
    }
  });
}