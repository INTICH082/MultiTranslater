import { getSettings } from "./tauriCommands";

export interface TranslateApiResponse {
  finalText: string;
  explanation?: string;
  usedProviders: string[];
  raw: { provider: string; text: string; latencyMs: number; error?: string }[];
}

export interface ProvidersInfo {
  providers: { id: string; displayName: string }[];
  llm: { anthropic: boolean; gemini: boolean };
}

export async function getProviders(): Promise<ProvidersInfo> {
  const settings = await getSettings();
  const res = await fetch(`${settings.backendUrl.replace(/\/$/, "")}/api/providers`);
  if (!res.ok) throw new Error(`Backend вернул ошибку ${res.status}`);
  return res.json();
}

export async function translateText(params: {
  text: string;
  targetLang: string;
  providers?: string[];
}): Promise<TranslateApiResponse> {
  const settings = await getSettings();

  const res = await fetch(`${settings.backendUrl.replace(/\/$/, "")}/api/translate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      text: params.text,
      sourceLang: "auto",
      targetLang: params.targetLang,
      providers: params.providers,
      glossary: Object.keys(settings.glossary ?? {}).length > 0 ? settings.glossary : undefined,
    }),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.error ? JSON.stringify(body.error) : `Backend вернул ошибку ${res.status}`);
  }

  return res.json();
}