import {
  TranslationManager,
  createGoogleProvider,
  createMicrosoftProvider,
  createYandexProvider,
  type TranslationProvider,
} from "@multitranslate/core";
import { env } from "./env.js";

export function buildTranslationManager(): TranslationManager {
  const providers: TranslationProvider[] = [];

  if (env.GOOGLE_TRANSLATE_API_KEY) {
    providers.push(createGoogleProvider(env.GOOGLE_TRANSLATE_API_KEY));
  }
  if (env.MICROSOFT_TRANSLATOR_KEY && env.MICROSOFT_TRANSLATOR_REGION) {
    providers.push(createMicrosoftProvider(env.MICROSOFT_TRANSLATOR_KEY, env.MICROSOFT_TRANSLATOR_REGION));
  }
  if (env.YANDEX_TRANSLATE_API_KEY && env.YANDEX_FOLDER_ID) {
    providers.push(createYandexProvider(env.YANDEX_TRANSLATE_API_KEY, env.YANDEX_FOLDER_ID));
  }

  if (providers.length === 0) {
    // eslint-disable-next-line no-console
    console.warn(
      "[multitranslate] Ни один провайдер перевода не настроен — заполните .env (см. .env.example)"
    );
  }

  return new TranslationManager(providers, env.ANTHROPIC_API_KEY);
}