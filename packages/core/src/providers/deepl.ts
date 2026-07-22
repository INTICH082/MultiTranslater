import type { TranslationProvider, TranslationResult } from "../types.js";

export function createDeepLProvider(apiKey: string): TranslationProvider {
  const baseUrl = apiKey.endsWith(":fx") ? "https://api-free.deepl.com/v2/translate" : "https://api.deepl.com/v2/translate";

  return {
    id: "deepl",
    displayName: "DeepL",
    async translate({ text, sourceLang, targetLang }): Promise<TranslationResult> {
      const start = Date.now();
      try {
        const body: Record<string, unknown> = {
          text: [text],
          target_lang: targetLang.toUpperCase(),
        };
        if (sourceLang !== "auto") body.source_lang = sourceLang.toUpperCase();

        const res = await fetch(baseUrl, {
          method: "POST",
          headers: {
            Authorization: `DeepL-Auth-Key ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(body),
        });

        if (!res.ok) {
          throw new Error(`DeepL HTTP ${res.status}: ${await res.text()}`);
        }

        const data = (await res.json()) as { translations: { text: string }[] };

        return {
          provider: "deepl",
          text: data.translations[0]?.text ?? "",
          latencyMs: Date.now() - start,
        };
      } catch (err) {
        return {
          provider: "deepl",
          text: "",
          latencyMs: Date.now() - start,
          error: err instanceof Error ? err.message : String(err),
        };
      }
    },
  };
}