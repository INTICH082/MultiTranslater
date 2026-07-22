import Fastify from "fastify";
import cors from "@fastify/cors";
import rateLimit from "@fastify/rate-limit";
import { env } from "./env.js";
import { buildTranslationManager } from "./translationManager.js";
import { registerTranslateRoutes } from "./routes/translate.js";

const app = Fastify({ logger: true });

await app.register(cors, {
  origin: env.ALLOWED_ORIGINS === "*" ? true : env.ALLOWED_ORIGINS.split(","),
});

// Защита от злоупотребления бесплатными квотами API переводчиков
await app.register(rateLimit, {
  max: 60,
  timeWindow: "1 minute",
});

const manager = buildTranslationManager();
registerTranslateRoutes(app, manager);

app.get("/health", async () => ({ status: "ok" }));

app
  .listen({ port: Number(env.PORT), host: "0.0.0.0" })
  .then(() => app.log.info(`MultiTranslate backend запущен на порту ${env.PORT}`))
  .catch((err) => {
    app.log.error(err);
    process.exit(1);
  });