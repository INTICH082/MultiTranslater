import { useEffect, useState } from "react";
import { getSettings, updateSettings, startAreaSelection, type Settings } from "../lib/tauriCommands";

const LANGUAGES = [
  { code: "ru", label: "Русский" },
  { code: "en", label: "English" },
  { code: "de", label: "Deutsch" },
  { code: "es", label: "Español" },
  { code: "zh", label: "中文" },
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

export default function SettingsWindow() {
  const [backendUrl, setBackendUrl] = useState("http://localhost:8787");
  const [targetLang, setTargetLang] = useState("ru");
  const [glossary, setGlossary] = useState<GlossaryEntry[]>([]);
  const [saved, setSaved] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    getSettings().then((s) => {
      setBackendUrl(s.backendUrl);
      setTargetLang(s.targetLang);
      setGlossary(toList(s.glossary));
      setLoaded(true);
    });
  }, []);

  async function save() {
    const settings: Settings = { backendUrl, targetLang, glossary: toObject(glossary) };
    await updateSettings(settings);
    setSaved(true);
    setTimeout(() => setSaved(false), 1200);
  }

  function updateEntry(index: number, field: keyof GlossaryEntry, value: string) {
    setGlossary((prev) => prev.map((e, i) => (i === index ? { ...e, [field]: value } : e)));
  }

  function removeEntry(index: number) {
    setGlossary((prev) => prev.filter((_, i) => i !== index));
  }

  if (!loaded) return null;

  return (
    <div style={{ fontFamily: "system-ui, sans-serif", padding: 16, background: "#fff", height: "100%" }}>
      <h2 style={{ fontSize: 16, margin: "0 0 12px" }}>MultiTranslate</h2>

      <label style={{ display: "block", fontSize: 12, marginBottom: 4 }}>Целевой язык</label>
      <select
        value={targetLang}
        onChange={(e) => setTargetLang(e.target.value)}
        style={{ width: "100%", marginBottom: 12, padding: 6 }}
      >
        {LANGUAGES.map((l) => (
          <option key={l.code} value={l.code}>
            {l.label}
          </option>
        ))}
      </select>

      <label style={{ display: "block", fontSize: 12, marginBottom: 4 }}>Адрес backend</label>
      <input
        value={backendUrl}
        onChange={(e) => setBackendUrl(e.target.value)}
        style={{ width: "100%", marginBottom: 12, padding: 6, boxSizing: "border-box" }}
      />

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
        <label style={{ fontSize: 12 }}>Пользовательский словарь</label>
        <button
          onClick={() => setGlossary((prev) => [...prev, { term: "", translation: "" }])}
          style={{ fontSize: 11, padding: "2px 8px", cursor: "pointer" }}
        >
          + добавить
        </button>
      </div>

      <div style={{ maxHeight: 140, overflowY: "auto" }}>
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

      <button
        onClick={() => startAreaSelection()}
        style={{ width: "100%", padding: 8, marginTop: 8, cursor: "pointer" }}
      >
        Перевести область экрана
      </button>

      <p style={{ fontSize: 11, color: "#666", marginTop: 12 }}>
        Глобальная горячая клавиша Alt+Shift+T работает из любого приложения — не
        обязательно держать это окно открытым.
      </p>
    </div>
  );
}