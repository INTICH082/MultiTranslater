export interface TranslationResult {
  provider: string;
  text: string;
  latencyMs: number;
  error?: string;
}

export interface TranslateRequest {
  text: string;
  sourceLang: string; // "auto" допустим
  targetLang: string;
  providers?: string[];
  glossary?: Record<string, string>;
}

export interface MergedTranslation {
  finalText: string;
  explanation?: string;
  usedProviders: string[];
  raw: TranslationResult[];
}

export interface TranslationProvider {
  readonly id: string;
  readonly displayName: string;
  translate(req: {
    text: string;
    sourceLang: string;
    targetLang: string;
  }): Promise<TranslationResult>;
}