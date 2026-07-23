import type { TranslationProvider, TranslateRequest, MergedTranslation, TranslationResult } from "./types.js";
import { mergeTranslations } from "./analysis/merge.js";

export interface LlmKeys {
  anthropicApiKey?: string;
  geminiApiKey?: string;
}

export class TranslationManager {
  private providers: Map<string, TranslationProvider> = new Map();

  constructor(
    providers: TranslationProvider[],
    private readonly llmKeys: LlmKeys = {}
  ) {
    for (const p of providers) this.providers.set(p.id, p);
  }

  listProviders(): { id: string; displayName: string }[] {
    return [...this.providers.values()].map((p) => ({ id: p.id, displayName: p.displayName }));
  }

  async translate(req: TranslateRequest): Promise<MergedTranslation> {
    const active = (req.providers?.length
      ? req.providers.map((id) => this.providers.get(id)).filter(Boolean)
      : [...this.providers.values()]) as TranslationProvider[];

    if (active.length === 0) {
      throw new Error("Нет доступных провайдеров перевода");
    }

    // Запускаем все переводы параллельно — задержка равна самому медленному, а не сумме
    const results: TranslationResult[] = await Promise.all(
      active.map((p) =>
        p.translate({ text: req.text, sourceLang: req.sourceLang, targetLang: req.targetLang })
      )
    );

    return mergeTranslations({
      anthropicApiKey: this.llmKeys.anthropicApiKey,
      geminiApiKey: this.llmKeys.geminiApiKey,
      originalText: req.text,
      sourceLang: req.sourceLang,
      targetLang: req.targetLang,
      results,
      glossary: req.glossary,
      withExplanation: false,
    });
  }
}