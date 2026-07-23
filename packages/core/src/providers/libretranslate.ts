import type { TranslationProvider, TranslationResult } from "../types.js";

export function createLibreTranslateProvider(baseUrl: string, apiKey?: string): TranslationProvider {
  return {
    id: "libretranslate",
    displayName: "LibreTranslate",
    async translate({ text, sourceLang, targetLang }): Promise<TranslationResult> {
      const start = Date.now();
      try {
        const res = await fetch(`${baseUrl.replace(/\/$/, "")}/translate`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            q: text,
            source: sourceLang === "auto" ? "auto" : sourceLang,
            target: targetLang,
            format: "text",
            ...(apiKey ? { api_key: apiKey } : {}),
          }),
        });

        if (!res.ok) {
          throw new Error(`LibreTranslate HTTP ${res.status}: ${await res.text()}`);
        }

        const data = (await res.json()) as { translatedText: string };

        return {
          provider: "libretranslate",
          text: data.translatedText ?? "",
          latencyMs: Date.now() - start,
        };
      } catch (err) {
        return {
          provider: "libretranslate",
          text: "",
          latencyMs: Date.now() - start,
          error: err instanceof Error ? err.message : String(err),
        };
      }
    },
  };
}