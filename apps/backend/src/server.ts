import Fastify from "fastify";
import cors from "@fastify/cors";
import rateLimit from "@fastify/rate-limit";
import { env } from "./env.js";
import { buildTranslationManager } from "./translationManager.js";
import { buildOcrProvider } from "./ocr.js";
import { registerTranslateRoutes } from "./routes/translate.js";
import { registerOcrTranslateRoutes } from "./routes/ocrTranslate.js";

const app = Fastify({ logger: true, bodyLimit: 15 * 1024 * 1024 });

await app.register(cors, {
  origin: env.ALLOWED_ORIGINS === "*" ? true : env.ALLOWED_ORIGINS.split(","),
});

// Защита от злоупотребления бесплатными квотами API переводчиков
await app.register(rateLimit, {
  max: 60,
  timeWindow: "1 minute",
});

const manager = buildTranslationManager();
const ocr = buildOcrProvider();
registerTranslateRoutes(app, manager);
registerOcrTranslateRoutes(app, manager, ocr);

app.get("/health", async () => ({ status: "ok" }));

app
  .listen({ port: Number(env.PORT), host: "0.0.0.0" })
  .then(() => app.log.info(`MultiTranslate backend запущен на порту ${env.PORT}`))
  .catch((err) => {
    app.log.error(err);
    process.exit(1);
  });