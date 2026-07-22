import type { TranslationProvider, TranslationResult } from "../types.js";

export function createGoogleProvider(apiKey: string): TranslationProvider {
  return {
    id: "google",
    displayName: "Google Translate",
    async translate({ text, sourceLang, targetLang }): Promise<TranslationResult> {
      const start = Date.now();
      try {
        const url = new URL("https://translation.googleapis.com/language/translate/v2");
        url.searchParams.set("key", apiKey);

        const body: Record<string, string> = {
          q: text,
          target: targetLang,
          format: "text",
        };
        if (sourceLang !== "auto") body.source = sourceLang;

        const res = await fetch(url.toString(), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });

        if (!res.ok) {
          throw new Error(`Google Translate HTTP ${res.status}: ${await res.text()}`);
        }

        const data = (await res.json()) as {
          data: { translations: { translatedText: string }[] };
        };

        return {
          provider: "google",
          text: data.data.translations[0]?.translatedText ?? "",
          latencyMs: Date.now() - start,
        };
      } catch (err) {
        return {
          provider: "google",
          text: "",
          latencyMs: Date.now() - start,
          error: err instanceof Error ? err.message : String(err),
        };
      }
    },
  };
}