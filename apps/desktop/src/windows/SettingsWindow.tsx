import { useEffect, useState } from "react";
import { getSettings, updateSettings, startAreaSelection, type Settings } from "../lib/tauriCommands";
import { getProviders, translateText, type ProvidersInfo } from "../lib/backendApi";

const LANGUAGES = [
  { code: "ru", label: "Русский" },
  { code: "en", label: "English" },
  { code: "de", label: "Deutsch" },
  { code: "es", label: "Español" },
  { code: "zh", label: "中文" },
];

const KNOWN_PROVIDERS: { id: string; label: string }[] = [
  { id: "deepl", label: "DeepL" },
  { id: "groq", label: "Groq (Llama)" },
  { id: "libretranslate", label: "LibreTranslate" },
  { id: "mymemory", label: "MyMemory" },
  { id: "google", label: "Google Translate" },
  { id: "microsoft", label: "Microsoft Translator" },
  { id: "yandex", label: "Yandex Translate" },
  { id: "openai", label: "OpenAI" },
];

interface GlossaryEntry {
  term: string;
  translation: string;
}

function toList(obj: Record<string, string>): GlossaryEntry[] {
  return Object.entries(obj).map(([term, translation]) => ({ term, translation }));
}

function toObject(list: GlossaryEntry[]): Record<string, string> {
  const obj: Record<string, string> = {};
  for (const { term, translation } of list) {
    const key = term.trim();
    if (key && translation.trim()) obj[key] = translation.trim();
  }
  return obj;
}

type Tab = "translate" | "settings";

export default function SettingsWindow() {
  const [tab, setTab] = useState<Tab>("translate");
  const [loaded, setLoaded] = useState(false);

  const [backendUrl, setBackendUrl] = useState("http://localhost:8787");
  const [targetLang, setTargetLang] = useState("ru");
  const [glossary, setGlossary] = useState<GlossaryEntry[]>([]);
  const [enabledProviders, setEnabledProviders] = useState<string[]>([]);
  const [saved, setSaved] = useState(false);

  const [providersInfo, setProvidersInfo] = useState<ProvidersInfo | null>(null);
  const [providersError, setProvidersError] = useState<string | null>(null);

  const [inputText, setInputText] = useState("");
  const [translating, setTranslating] = useState(false);
  const [translation, setTranslation] = useState<string | null>(null);
  const [translationError, setTranslationError] = useState<string | null>(null);

  useEffect(() => {
    getSettings().then((s) => {
      setBackendUrl(s.backendUrl);
      setTargetLang(s.targetLang);
      setGlossary(toList(s.glossary));
      setEnabledProviders(s.enabledProviders ?? []);
      setLoaded(true);
    });
    refreshProviders();
  }, []);

  async function refreshProviders() {
    setProvidersError(null);
    try {
      setProvidersInfo(await getProviders());
    } catch (err) {
      setProvidersError(err instanceof Error ? err.message : String(err));
    }
  }

  async function save() {
    const settings: Settings = {
      backendUrl,
      targetLang,
      glossary: toObject(glossary),
      enabledProviders,
    };
    await updateSettings(settings);
    setSaved(true);
    setTimeout(() => setSaved(false), 1200);
  }

  function toggleProvider(id: string) {
    setEnabledProviders((prev) => (prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]));
  }

  function updateEntry(index: number, field: keyof GlossaryEntry, value: string) {
    setGlossary((prev) => prev.map((e, i) => (i === index ? { ...e, [field]: value } : e)));
  }

  function removeEntry(index: number) {
    setGlossary((prev) => prev.filter((_, i) => i !== index));
  }

  async function runTranslate() {
    if (!inputText.trim()) return;
    setTranslating(true);
    setTranslationError(null);
    setTranslation(null);
    try {
      const result = await translateText({
        text: inputText,
        targetLang,
        providers: enabledProviders.length > 0 ? enabledProviders : undefined,
      });
      setTranslation(result.finalText);
    } catch (err) {
      setTranslationError(err instanceof Error ? err.message : String(err));
    } finally {
      setTranslating(false);
    }
  }

  if (!loaded) return null;

  const activeIds = new Set(providersInfo?.providers.map((p) => p.id) ?? []);

  return (
    <div style={{ fontFamily: "system-ui, sans-serif", background: "#fff", height: "100%", overflowY: "auto" }}>
      <div style={{ display: "flex", borderBottom: "1px solid #eee" }}>
        <button
          onClick={() => setTab("translate")}
          style={{
            flex: 1,
            padding: 10,
            border: "none",
            background: tab === "translate" ? "#f3f4f6" : "transparent",
            fontWeight: tab === "translate" ? 600 : 400,
            cursor: "pointer",
          }}
        >
          Перевод
        </button>
        <button
          onClick={() => setTab("settings")}
          style={{
            flex: 1,
            padding: 10,
            border: "none",
            background: tab === "settings" ? "#f3f4f6" : "transparent",
            fontWeight: tab === "settings" ? 600 : 400,
            cursor: "pointer",
          }}
        >
          Настройки
        </button>
      </div>

      {tab === "translate" && (
        <div style={{ padding: 16 }}>
          <label style={{ display: "block", fontSize: 12, marginBottom: 4 }}>Целевой язык</label>
          <select
            value={targetLang}
            onChange={(e) => setTargetLang(e.target.value)}
            style={{ width: "100%", marginBottom: 10, padding: 6 }}
          >
            {LANGUAGES.map((l) => (
              <option key={l.code} value={l.code}>
                {l.label}
              </option>
            ))}
          </select>

          <textarea
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Введите текст для перевода..."
            rows={4}
            style={{ width: "100%", padding: 8, boxSizing: "border-box", resize: "vertical", fontFamily: "inherit" }}
          />

          <button
            onClick={runTranslate}
            disabled={translating || !inputText.trim()}
            style={{ width: "100%", padding: 8, marginTop: 8, cursor: "pointer" }}
          >
            {translating ? "Перевожу..." : "Перевести"}
          </button>

          {translationError && <p style={{ fontSize: 12, color: "#b91c1c", marginTop: 8 }}>{translationError}</p>}

          {translation !== null && !translationError && (
            <div
              style={{
                marginTop: 10,
                padding: 10,
                borderRadius: 8,
                background: "#f3f4f6",
                fontSize: 14,
                lineHeight: 1.4,
                whiteSpace: "pre-wrap",
              }}
            >
              {translation}
            </div>
          )}

          <button
            onClick={() => startAreaSelection()}
            style={{ width: "100%", padding: 8, marginTop: 10, cursor: "pointer" }}
          >
            Перевести область экрана
          </button>

          <p style={{ fontSize: 11, color: "#666", marginTop: 10 }}>
            Alt+Shift+T работает из любого приложения — не обязательно держать это окно открытым.
          </p>
        </div>
      )}

      {tab === "settings" && (
        <div style={{ padding: 16 }}>
          <label style={{ display: "block", fontSize: 12, marginBottom: 4 }}>Адрес backend</label>
          <input
            value={backendUrl}
            onChange={(e) => setBackendUrl(e.target.value)}
            style={{ width: "100%", marginBottom: 12, padding: 6, boxSizing: "border-box" }}
          />

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
            <label style={{ fontSize: 12, fontWeight: 600 }}>Провайдеры перевода</label>
            <button onClick={refreshProviders} style={{ fontSize: 11, padding: "2px 8px", cursor: "pointer" }}>
              ⟳ обновить
            </button>
          </div>

          {providersError && (
            <p style={{ fontSize: 11, color: "#b91c1c", marginBottom: 8 }}>
              Не удалось получить список: {providersError}
            </p>
          )}

          <p style={{ fontSize: 10, color: "#888", margin: "0 0 6px" }}>
            Отметь нужные — если ничего не отмечено, используются все настроенные на backend.
          </p>

          <div style={{ maxHeight: 140, overflowY: "auto", marginBottom: 12 }}>
            {KNOWN_PROVIDERS.map((p) => {
              const isActive = activeIds.has(p.id);
              return (
                <label
                  key={p.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "4px 0",
                    fontSize: 12,
                    opacity: isActive ? 1 : 0.45,
                  }}
                >
                  <input
                    type="checkbox"
                    disabled={!isActive}
                    checked={isActive && enabledProviders.includes(p.id)}
                    onChange={() => toggleProvider(p.id)}
                  />
                  {p.label}
                  <span style={{ marginLeft: "auto", fontSize: 10, color: isActive ? "#16a34a" : "#999" }}>
                    {isActive ? "● активен" : "○ не настроен"}
                  </span>
                </label>
              );
            })}
          </div>

          <p style={{ fontSize: 11, color: "#666", marginBottom: 12 }}>
            LLM-сравнение переводов:{" "}
            {providersInfo?.llm.anthropic
              ? "Anthropic активен"
              : providersInfo?.llm.gemini
                ? "Gemini активен"
                : "не настроено — берётся первый успешный вариант"}
          </p>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
            <label style={{ fontSize: 12 }}>Пользовательский словарь</label>
            <button
              onClick={() => setGlossary((prev) => [...prev, { term: "", translation: "" }])}
              style={{ fontSize: 11, padding: "2px 8px", cursor: "pointer" }}
            >
              + добавить
            </button>
          </div>

          <div style={{ maxHeight: 120, overflowY: "auto" }}>
            {glossary.map((entry, i) => (
              <div key={i} style={{ display: "flex", gap: 4, marginBottom: 6 }}>
                <input
                  placeholder="термин"
                  value={entry.term}
                  onChange={(e) => updateEntry(i, "term", e.target.value)}
                  style={{ flex: 1, padding: 4, minWidth: 0 }}
                />
                <input
                  placeholder="перевод"
                  value={entry.translation}
                  onChange={(e) => updateEntry(i, "translation", e.target.value)}
                  style={{ flex: 1, padding: 4, minWidth: 0 }}
                />
                <button onClick={() => removeEntry(i)} style={{ padding: "0 8px", cursor: "pointer" }}>
                  ×
                </button>
              </div>
            ))}
          </div>

          <button onClick={save} style={{ width: "100%", padding: 8, marginTop: 8, cursor: "pointer" }}>
            {saved ? "Сохранено ✓" : "Сохранить"}
          </button>
        </div>
      )}
    </div>
  );
}