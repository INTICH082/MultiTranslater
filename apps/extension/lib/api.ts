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
  const base = (backendUrl as string | undefined) ?? DEFAULT_BACKEND_URL;

  const res = await fetch(`${base}/api/translate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      text: params.text,
      sourceLang: params.sourceLang ?? "auto",
      targetLang: params.targetLang,
    }),
  });

  if (!res.ok) {
    throw new Error(`Backend вернул ошибку ${res.status}`);
  }

  return res.json();
}