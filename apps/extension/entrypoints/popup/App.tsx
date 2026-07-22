import { useEffect, useState } from "react";

const LANGUAGES = [
  { code: "ru", label: "Русский" },
  { code: "en", label: "English" },
  { code: "de", label: "Deutsch" },
  { code: "es", label: "Español" },
  { code: "zh", label: "中文" },
];

export default function App() {
  const [backendUrl, setBackendUrl] = useState("http://localhost:8787");
  const [targetLang, setTargetLang] = useState("ru");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    browser.storage.sync.get(["backendUrl", "targetLang"]).then((stored) => {
      if (stored.backendUrl) setBackendUrl(stored.backendUrl as string);
      if (stored.targetLang) setTargetLang(stored.targetLang as string);
    });
  }, []);

  async function save() {
    await browser.storage.sync.set({ backendUrl, targetLang });
    setSaved(true);
    setTimeout(() => setSaved(false), 1200);
  }

  return (
    <div style={{ fontFamily: "system-ui, sans-serif", padding: 16 }}>
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

      <button onClick={save} style={{ width: "100%", padding: 8, cursor: "pointer" }}>
        {saved ? "Сохранено ✓" : "Сохранить"}
      </button>

      <p style={{ fontSize: 11, color: "#666", marginTop: 12 }}>
        Выделите текст на странице и выберите «Перевести через MultiTranslate» в контекстном меню.
      </p>
    </div>
  );
}