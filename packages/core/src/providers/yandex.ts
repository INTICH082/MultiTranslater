import type { TranslationProvider, TranslationResult } from "../types.js";

export function createYandexProvider(apiKey: string, folderId: string): TranslationProvider {
  return {
    id: "yandex",
    displayName: "Yandex Translate",
    async translate({ text, sourceLang, targetLang }): Promise<TranslationResult> {
      const start = Date.now();
      try {
        const res = await fetch("https://translate.api.cloud.yandex.net/translate/v2/translate", {
          method: "POST",
          headers: {
            Authorization: `Api-Key ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            folderId,
            texts: [text],
            targetLanguageCode: targetLang,
            ...(sourceLang !== "auto" ? { sourceLanguageCode: sourceLang } : {}),
          }),
        });

        if (!res.ok) {
          throw new Error(`Yandex Translate HTTP ${res.status}: ${await res.text()}`);
        }

        const data = (await res.json()) as { translations: { text: string }[] };

        return {
          provider: "yandex",
          text: data.translations[0]?.text ?? "",
          latencyMs: Date.now() - start,
        };
      } catch (err) {
        return {
          provider: "yandex",
          text: "",
          latencyMs: Date.now() - start,
          error: err instanceof Error ? err.message : String(err),
        };
      }
    },
  };
}