import type { TranslationProvider, TranslationResult } from "../types.js";

export function createMyMemoryProvider(contactEmail?: string): TranslationProvider {
  return {
    id: "mymemory",
    displayName: "MyMemory",
    async translate({ text, sourceLang, targetLang }): Promise<TranslationResult> {
      const start = Date.now();
      try {
        const url = new URL("https://api.mymemory.translated.net/get");
        url.searchParams.set("q", text);
        // MyMemory не понимает "auto" — без языка источника считает langpair некорректным
        url.searchParams.set("langpair", `${sourceLang === "auto" ? "en" : sourceLang}|${targetLang}`);
        if (contactEmail) url.searchParams.set("de", contactEmail);

        const res = await fetch(url.toString());

        if (!res.ok) {
          throw new Error(`MyMemory HTTP ${res.status}: ${await res.text()}`);
        }

        const data = (await res.json()) as {
          responseData: { translatedText: string };
          responseStatus: number | string;
        };

        if (String(data.responseStatus) !== "200") {
          throw new Error(`MyMemory вернул статус ${data.responseStatus}`);
        }

        return {
          provider: "mymemory",
          text: data.responseData?.translatedText ?? "",
          latencyMs: Date.now() - start,
        };
      } catch (err) {
        return {
          provider: "mymemory",
          text: "",
          latencyMs: Date.now() - start,
          error: err instanceof Error ? err.message : String(err),
        };
      }
    },
  };
}