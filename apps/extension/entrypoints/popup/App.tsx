import { useEffect, useState } from "react";

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

function glossaryObjectToList(obj: Record<string, string> | undefined): GlossaryEntry[] {
  if (!obj) return [];
  return Object.entries(obj).map(([term, translation]) => ({ term, translation }));
}

function glossaryListToObject(list: GlossaryEntry[]): Record<string, string> {
  const obj: Record<string, string> = {};
  for (const { term, translation } of list) {
    const key = term.trim();
    if (key && translation.trim()) obj[key] = translation.trim();
  }
  return obj;
}

export default function App() {
  const [backendUrl, setBackendUrl] = useState("http://localhost:8787");
  const [targetLang, setTargetLang] = useState("ru");
  const [glossary, setGlossary] = useState<GlossaryEntry[]>([]);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    browser.storage.sync.get(["backendUrl", "targetLang"]).then((stored) => {
      if (stored.backendUrl) setBackendUrl(stored.backendUrl as string);
      if (stored.targetLang) setTargetLang(stored.targetLang as string);
    });
    browser.storage.local.get("glossary").then((stored) => {
      setGlossary(glossaryObjectToList(stored.glossary as Record<string, string> | undefined));
    });
  }, []);

  async function save() {
    await browser.storage.sync.set({ backendUrl, targetLang });
    await browser.storage.local.set({ glossary: glossaryListToObject(glossary) });
    setSaved(true);
    setTimeout(() => setSaved(false), 1200);
  }

  function updateEntry(index: number, field: keyof GlossaryEntry, value: string) {
    setGlossary((prev) => prev.map((e, i) => (i === index ? { ...e, [field]: value } : e)));
  }

  function removeEntry(index: number) {
    setGlossary((prev) => prev.filter((_, i) => i !== index));
  }

  function addEntry() {
    setGlossary((prev) => [...prev, { term: "", translation: "" }]);
  }

  return (
    <div style={{ fontFamily: "system-ui, sans-serif", padding: 16, maxHeight: 480, overflowY: "auto" }}>
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
        <button onClick={addEntry} style={{ fontSize: 11, padding: "2px 8px", cursor: "pointer" }}>
          + добавить
        </button>
      </div>

      {glossary.length === 0 && (
        <p style={{ fontSize: 11, color: "#888", margin: "0 0 8px" }}>
          Пусто. Добавьте термины, перевод которых всегда должен быть одинаковым
          (например, названия продуктов или отраслевые термины).
        </p>
      )}

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
          <button
            onClick={() => removeEntry(i)}
            title="Удалить"
            style={{ padding: "0 8px", cursor: "pointer" }}
          >
            ×
          </button>
        </div>
      ))}

      <button onClick={save} style={{ width: "100%", padding: 8, marginTop: 8, cursor: "pointer" }}>
        {saved ? "Сохранено ✓" : "Сохранить"}
      </button>

      <button
        onClick={async () => {
          const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
          if (tab?.id) {
            await browser.tabs.sendMessage(tab.id, { type: "MULTITRANSLATE_START_AREA_SELECT" });
            window.close();
          }
        }}
        style={{ width: "100%", padding: 8, marginTop: 8, cursor: "pointer" }}
      >
        Перевести область экрана
      </button>

      <p style={{ fontSize: 11, color: "#666", marginTop: 12 }}>
        Текст: выделите на странице → правый клик → «Перевести через MultiTranslate».
        <br />
        Область экрана: кнопка выше или Alt+Shift+T, затем выделите прямоугольник мышью (Esc — отмена).
        <br />
        Словарь применяется автоматически к обоим типам перевода.
      </p>
    </div>
  );
}