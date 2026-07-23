export interface TranslateApiResponse {
  finalText: string;
  explanation?: string;
  usedProviders: string[];
  raw: { provider: string; text: string; latencyMs: number; error?: string }[];
}

const DEFAULT_BACKEND_URL = "http://localhost:8787";

async function getBackendUrl(): Promise<string> {
  const { backendUrl } = await browser.storage.sync.get("backendUrl");
  return (backendUrl as string | undefined) ?? DEFAULT_BACKEND_URL;
}

/** Пусто/не задано — значит используем все провайдеры, настроенные на backend */
async function getEnabledProviders(): Promise<string[] | undefined> {
  const { enabledProviders } = await browser.storage.local.get("enabledProviders");
  const list = enabledProviders as string[] | undefined;
  return list && list.length > 0 ? list : undefined;
}

export interface ProvidersInfo {
  providers: { id: string; displayName: string }[];
  llm: { anthropic: boolean; gemini: boolean };
}

/** Список провайдеров, реально настроенных (с ключом) на backend прямо сейчас */
export async function getProviders(): Promise<ProvidersInfo> {
  const base = await getBackendUrl();
  const res = await fetch(`${base}/api/providers`);
  if (!res.ok) {
    throw new Error(`Backend вернул ошибку ${res.status}`);
  }
  return res.json();
}

export async function translateText(params: {
  text: string;
  sourceLang?: string;
  targetLang: string;
}): Promise<TranslateApiResponse> {
  const base = await getBackendUrl();
  const { glossary } = await browser.storage.local.get("glossary");
  const providers = await getEnabledProviders();

  const res = await fetch(`${base}/api/translate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      text: params.text,
      sourceLang: params.sourceLang ?? "auto",
      targetLang: params.targetLang,
      providers,
      glossary: glossary && Object.keys(glossary).length > 0 ? glossary : undefined,
    }),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.error ? JSON.stringify(body.error) : `Backend вернул ошибку ${res.status}`);
  }

  return res.json();
}

export interface OcrTranslateApiResponse {
  recognizedText: string;
  translation: TranslateApiResponse | null;
  message?: string;
}

export async function translateImageArea(params: {
  imageBase64: string;
  targetLang: string;
}): Promise<OcrTranslateApiResponse> {
  const base = await getBackendUrl();
  const { glossary } = await browser.storage.local.get("glossary");
  const providers = await getEnabledProviders();

  const res = await fetch(`${base}/api/ocr-translate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      imageBase64: params.imageBase64,
      sourceLang: "auto",
      targetLang: params.targetLang,
      providers,
      glossary: glossary && Object.keys(glossary).length > 0 ? glossary : undefined,
    }),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.error ? JSON.stringify(body.error) : `Backend вернул ошибку ${res.status}`);
  }

  return res.json();
}