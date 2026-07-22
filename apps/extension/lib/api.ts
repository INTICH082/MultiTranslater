export interface TranslateApiResponse {
  finalText: string;
  explanation?: string;
  usedProviders: string[];
  raw: { provider: string; text: string; latencyMs: number; error?: string }[];
}

const DEFAULT_BACKEND_URL = "http://localhost:8787";

export async function translateText(params: {
  text: string;
  sourceLang?: string;
  targetLang: string;
}): Promise<TranslateApiResponse> {
  const { backendUrl } = await chrome.storage.sync.get("backendUrl");
  const { glossary } = await chrome.storage.local.get("glossary");
  const base = (backendUrl as string | undefined) ?? DEFAULT_BACKEND_URL;

  const res = await fetch(`${base}/api/translate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      text: params.text,
      sourceLang: params.sourceLang ?? "auto",
      targetLang: params.targetLang,
      glossary: glossary && Object.keys(glossary).length > 0 ? glossary : undefined,
    }),
  });

  if (!res.ok) {
    throw new Error(`Backend вернул ошибку ${res.status}`);
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
  const { backendUrl } = await chrome.storage.sync.get("backendUrl");
  const { glossary } = await chrome.storage.local.get("glossary");
  const base = (backendUrl as string | undefined) ?? DEFAULT_BACKEND_URL;

  const res = await fetch(`${base}/api/ocr-translate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      imageBase64: params.imageBase64,
      sourceLang: "auto",
      targetLang: params.targetLang,
      glossary: glossary && Object.keys(glossary).length > 0 ? glossary : undefined,
    }),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.error ? JSON.stringify(body.error) : `Backend вернул ошибку ${res.status}`);
  }

  return res.json();
}