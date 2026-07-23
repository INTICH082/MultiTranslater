import Anthropic from "@anthropic-ai/sdk";
import type { TranslationResult, MergedTranslation } from "../types.js";

interface ParsedModelResponse {
  finalText?: string;
  explanation?: string;
  bestSourceProvider?: string;
}

function parseModelJson(raw: string): ParsedModelResponse | null {
  try {
    return JSON.parse(raw.replace(/```json|```/g, "").trim());
  } catch {
    return null;
  }
}

async function callAnthropic(prompt: string, apiKey: string): Promise<string> {
  const anthropic = new Anthropic({ apiKey });
  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 1024,
    messages: [{ role: "user", content: prompt }],
  });
  const textBlock = response.content.find((b) => b.type === "text");
  return textBlock && "text" in textBlock ? textBlock.text : "{}";
}

async function callGemini(prompt: string, apiKey: string, model = "gemini-2.5-flash"): Promise<string> {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
    }
  );

  if (!res.ok) {
    throw new Error(`Gemini HTTP ${res.status}: ${await res.text()}`);
  }

  const data = (await res.json()) as {
    candidates?: { content?: { parts?: { text: string }[] } }[];
  };

  return data.candidates?.[0]?.content?.parts?.[0]?.text ?? "{}";
}

export async function mergeTranslations(params: {
  anthropicApiKey?: string;
  geminiApiKey?: string;
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

  const hasLlmKey = Boolean(params.anthropicApiKey || params.geminiApiKey);

  if (successful.length === 1 || !hasLlmKey) {
    return {
      finalText: successful[0].text,
      usedProviders: [successful[0].provider],
      raw: params.results,
      explanation:
        successful.length > 1 && !hasLlmKey
          ? "LLM-сравнение вариантов отключено (не задан ни ANTHROPIC_API_KEY, ни GEMINI_API_KEY) — показан первый успешный перевод."
          : undefined,
    };
  }

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

  let raw: string;
  try {
    // Anthropic в приоритете, если заданы оба ключа сразу
    raw = params.anthropicApiKey
      ? await callAnthropic(prompt, params.anthropicApiKey)
      : await callGemini(prompt, params.geminiApiKey!);
  } catch (err) {
    return {
      finalText: successful[0].text,
      usedProviders: [successful[0].provider],
      raw: params.results,
      explanation: `Ошибка модели анализа (${err instanceof Error ? err.message : String(err)}), использован необработанный вариант.`,
    };
  }

  const parsed = parseModelJson(raw);
  if (!parsed) {
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