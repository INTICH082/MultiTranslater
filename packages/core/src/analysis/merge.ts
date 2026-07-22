import Anthropic from "@anthropic-ai/sdk";
import type { TranslationResult, MergedTranslation } from "../types.js";

export async function mergeTranslations(params: {
  anthropicApiKey: string;
  originalText: string;
  sourceLang: string;
  targetLang: string;
  results: TranslationResult[];
  glossary?: Record<string, string>;
  withExplanation?: boolean;
}): Promise<MergedTranslation> {
  const successful = params.results.filter((r) => !r.error && r.text.trim().length > 0);

  if (successful.length === 0) {
    return {
      finalText: "",
      usedProviders: [],
      raw: params.results,
      explanation: "Все провайдеры вернули ошибку.",
    };
  }

  if (successful.length === 1) {
    return {
      finalText: successful[0].text,
      usedProviders: [successful[0].provider],
      raw: params.results,
    };
  }

  const anthropic = new Anthropic({ apiKey: params.anthropicApiKey });

  const glossaryBlock = params.glossary && Object.keys(params.glossary).length > 0
    ? `\n\nОбязательный словарь терминов (используй именно эти варианты перевода, если термин встречается):\n${Object.entries(
        params.glossary
      )
        .map(([k, v]) => `- "${k}" -> "${v}"`)
        .join("\n")}`
    : "";

  const variantsBlock = successful
    .map((r, i) => `${i + 1}. [${r.provider}]: ${r.text}`)
    .join("\n");

  const explanationField = params.withExplanation
    ? `\n  "explanation": "краткое объяснение выбора на русском (1-2 предложения)",`
    : "";

  const prompt = `Ты — эксперт-переводчик. Ниже приведён исходный текст и несколько машинных переводов от разных сервисов. Твоя задача: выбрать самый естественный, точный и грамматически корректный вариант, либо скомбинировать сильные стороны нескольких вариантов в единый итоговый перевод. Не добавляй ничего от себя, не меняй смысл.

Исходный текст (${params.sourceLang} -> ${params.targetLang}):
"""
${params.originalText}
"""

Варианты переводов:
${variantsBlock}${glossaryBlock}

Ответь СТРОГО в формате JSON без markdown-разметки и пояснений вокруг:
{
  "finalText": "итоговый перевод",${explanationField}
  "bestSourceProvider": "provider id, чей вариант лёг в основу (или 'combined', если скомбинировано)"
}`;

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 1024,
    messages: [{ role: "user", content: prompt }],
  });

  const textBlock = response.content.find((b) => b.type === "text");
  const raw = textBlock && "text" in textBlock ? textBlock.text : "{}";

  let parsed: { finalText?: string; explanation?: string; bestSourceProvider?: string };
  try {
    const cleaned = raw.replace(/```json|```/g, "").trim();
    parsed = JSON.parse(cleaned);
  } catch {
    // Фолбэк: если модель не вернула валидный JSON, берём первый успешный вариант
    return {
      finalText: successful[0].text,
      usedProviders: [successful[0].provider],
      raw: params.results,
      explanation: "Не удалось разобрать ответ модели анализа, использован необработанный вариант.",
    };
  }

  return {
    finalText: parsed.finalText ?? successful[0].text,
    explanation: parsed.explanation,
    usedProviders: successful.map((r) => r.provider),
    raw: params.results,
  };
}