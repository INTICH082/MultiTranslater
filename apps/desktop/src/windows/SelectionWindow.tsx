import { useCallback, useRef, useState } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { areaSelected, cancelAreaSelection } from "../lib/tauriCommands";

/**
 * Это окно занимает ровно площадь монитора (см. open_selection_window в main.rs),
 * поэтому его physical outerPosition совпадает с началом координат монитора.
 * Абсолютные физические координаты клика = outerPosition + clientXY * scaleFactor.
 */
export default function SelectionWindow() {
  const [rect, setRect] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  const start = useRef<{ x: number; y: number } | null>(null);

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    start.current = { x: e.clientX, y: e.clientY };
    setRect({ x: e.clientX, y: e.clientY, w: 0, h: 0 });
  }, []);

  const onMouseMove = useCallback((e: React.MouseEvent) => {
    if (!start.current) return;
    const x = Math.min(e.clientX, start.current.x);
    const y = Math.min(e.clientY, start.current.y);
    const w = Math.abs(e.clientX - start.current.x);
    const h = Math.abs(e.clientY - start.current.y);
    setRect({ x, y, w, h });
  }, []);

  const onMouseUp = useCallback(async (e: React.MouseEvent) => {
    if (!start.current) return;

    const cssX = Math.min(e.clientX, start.current.x);
    const cssY = Math.min(e.clientY, start.current.y);
    const cssW = Math.abs(e.clientX - start.current.x);
    const cssH = Math.abs(e.clientY - start.current.y);
    start.current = null;
    setRect(null);

    if (cssW < 4 || cssH < 4) return; // случайный клик — не считаем выделением

    const win = getCurrentWindow();
    const [scaleFactor, outerPosition] = await Promise.all([win.scaleFactor(), win.outerPosition()]);

    await areaSelected({
      x: Math.round(outerPosition.x + cssX * scaleFactor),
      y: Math.round(outerPosition.y + cssY * scaleFactor),
      width: Math.round(cssW * scaleFactor),
      height: Math.round(cssH * scaleFactor),
    });
  }, []);

  return (
    <div
      onMouseDown={onMouseDown}
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
      onKeyDown={(e) => e.key === "Escape" && cancelAreaSelection()}
      tabIndex={-1}
      autoFocus
      style={{
        width: "100vw",
        height: "100vh",
        cursor: "crosshair",
        background: "rgba(0,0,0,0.15)",
      }}
    >
      {rect && (
        <div
          style={{
            position: "fixed",
            left: rect.x,
            top: rect.y,
            width: rect.w,
            height: rect.h,
            border: "2px solid #3b82f6",
            background: "rgba(59,130,246,0.15)",
            pointerEvents: "none",
          }}
        />
      )}
    </div>
  );
}