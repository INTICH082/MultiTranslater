import type { TranslationProvider, TranslationResult } from "../types.js";

export function createGroqProvider(
  apiKey: string,
  model = "llama-3.3-70b-versatile"
): TranslationProvider {
  return {
    id: "groq",
    displayName: "Groq (Llama)",
    async translate({ text, sourceLang, targetLang }): Promise<TranslationResult> {
      const start = Date.now();
      try {
        const sourceHint = sourceLang === "auto" ? "" : ` с ${sourceLang}`;
        const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model,
            temperature: 0,
            messages: [
              {
                role: "system",
                content:
                  `Переведи текст пользователя${sourceHint} на язык с кодом "${targetLang}". ` +
                  `Ответь ТОЛЬКО переводом, без кавычек, пояснений и повторения оригинала.`,
              },
              { role: "user", content: text },
            ],
          }),
        });

        if (!res.ok) {
          throw new Error(`Groq HTTP ${res.status}: ${await res.text()}`);
        }

        const data = (await res.json()) as {
          choices: { message: { content: string } }[];
        };

        return {
          provider: "groq",
          text: data.choices[0]?.message?.content?.trim() ?? "",
          latencyMs: Date.now() - start,
        };
      } catch (err) {
        return {
          provider: "groq",
          text: "",
          latencyMs: Date.now() - start,
          error: err instanceof Error ? err.message : String(err),
        };
      }
    },
  };
}