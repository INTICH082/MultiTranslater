import { useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { closeResultWindow } from "../lib/tauriCommands";

export default function ResultWindow() {
  const [params] = useSearchParams();
  const text = params.get("text") ?? "";
  const isError = params.get("error") === "true";

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") closeResultWindow();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <div
      onClick={() => closeResultWindow()}
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        padding: 14,
        boxSizing: "border-box",
        fontFamily: "system-ui, sans-serif",
        fontSize: 14,
        lineHeight: 1.4,
        color: "#fff",
        background: isError ? "#b91c1c" : "#1f2937",
        borderRadius: 10,
        cursor: "pointer",
      }}
    >
      {text}
    </div>
  );
}