import type { TranslationProvider, TranslationResult } from "../types.js";

export function createMicrosoftProvider(apiKey: string, region: string): TranslationProvider {
  return {
    id: "microsoft",
    displayName: "Microsoft Translator",
    async translate({ text, sourceLang, targetLang }): Promise<TranslationResult> {
      const start = Date.now();
      try {
        const url = new URL("https://api.cognitive.microsofttranslator.com/translate");
        url.searchParams.set("api-version", "3.0");
        url.searchParams.set("to", targetLang);
        if (sourceLang !== "auto") url.searchParams.set("from", sourceLang);

        const res = await fetch(url.toString(), {
          method: "POST",
          headers: {
            "Ocp-Apim-Subscription-Key": apiKey,
            "Ocp-Apim-Subscription-Region": region,
            "Content-Type": "application/json",
          },
          body: JSON.stringify([{ Text: text }]),
        });

        if (!res.ok) {
          throw new Error(`Microsoft Translator HTTP ${res.status}: ${await res.text()}`);
        }

        const data = (await res.json()) as { translations: { text: string }[] }[];

        return {
          provider: "microsoft",
          text: data[0]?.translations[0]?.text ?? "",
          latencyMs: Date.now() - start,
        };
      } catch (err) {
        return {
          provider: "microsoft",
          text: "",
          latencyMs: Date.now() - start,
          error: err instanceof Error ? err.message : String(err),
        };
      }
    },
  };
}