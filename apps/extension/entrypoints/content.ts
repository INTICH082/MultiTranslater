export default defineContentScript({
  matches: ["<all_urls>"],
  main() {
    let host: HTMLDivElement | null = null;

    function removeOverlay() {
      host?.remove();
      host = null;
    }

    function showOverlay(content: string, isError = false) {
      removeOverlay();

      const selection = window.getSelection();
      const range = selection?.rangeCount ? selection.getRangeAt(0) : null;
      const rect = range?.getBoundingClientRect();

      host = document.createElement("div");
      host.style.position = "fixed";
      host.style.zIndex = "2147483647";
      host.style.top = `${(rect?.bottom ?? 100) + 8}px`;
      host.style.left = `${rect?.left ?? 100}px`;

      const shadow = host.attachShadow({ mode: "open" });
      const box = document.createElement("div");
      box.textContent = content;
      box.style.cssText = `
        max-width: 360px;
        padding: 10px 14px;
        border-radius: 10px;
        font-family: system-ui, sans-serif;
        font-size: 14px;
        line-height: 1.4;
        color: #fff;
        background: ${isError ? "#b91c1c" : "#1f2937"};
        box-shadow: 0 8px 24px rgba(0,0,0,0.25);
      `;
      shadow.appendChild(box);
      document.body.appendChild(host);

      // Клик в любом другом месте страницы закрывает всплывающее окно
      setTimeout(() => document.addEventListener("click", removeOverlay, { once: true }), 0);
    }

    function startAreaSelection() {
      const veil = document.createElement("div");
      veil.style.cssText = `
        position: fixed; inset: 0; z-index: 2147483646;
        background: rgba(0,0,0,0.15); cursor: crosshair;
      `;

      const box = document.createElement("div");
      box.style.cssText = `
        position: fixed; border: 2px solid #3b82f6; background: rgba(59,130,246,0.15);
        z-index: 2147483647; display: none; pointer-events: none;
      `;

      document.body.appendChild(veil);
      document.body.appendChild(box);

      let startX = 0;
      let startY = 0;
      let dragging = false;

      function cleanup() {
        veil.remove();
        box.remove();
        document.removeEventListener("keydown", onKeyDown);
      }

      function onKeyDown(e: KeyboardEvent) {
        if (e.key === "Escape") cleanup();
      }

      veil.addEventListener("mousedown", (e) => {
        dragging = true;
        startX = e.clientX;
        startY = e.clientY;
        box.style.display = "block";
        box.style.left = `${startX}px`;
        box.style.top = `${startY}px`;
        box.style.width = "0px";
        box.style.height = "0px";
      });

      veil.addEventListener("mousemove", (e) => {
        if (!dragging) return;
        const x = Math.min(e.clientX, startX);
        const y = Math.min(e.clientY, startY);
        const w = Math.abs(e.clientX - startX);
        const h = Math.abs(e.clientY - startY);
        box.style.left = `${x}px`;
        box.style.top = `${y}px`;
        box.style.width = `${w}px`;
        box.style.height = `${h}px`;
      });

      veil.addEventListener("mouseup", (e) => {
        if (!dragging) return;
        dragging = false;

        const rect = {
          x: Math.min(e.clientX, startX),
          y: Math.min(e.clientY, startY),
          width: Math.abs(e.clientX - startX),
          height: Math.abs(e.clientY - startY),
        };

        cleanup();

        if (rect.width < 4 || rect.height < 4) return; // случайный клик, а не выделение

        browser.runtime.sendMessage({
          type: "MULTITRANSLATE_AREA_SELECTED",
          rect,
          devicePixelRatio: window.devicePixelRatio,
        });
      });

      document.addEventListener("keydown", onKeyDown);
    }

    browser.runtime.onMessage.addListener((message: any) => {
      if (message?.type === "MULTITRANSLATE_RESULT") {
        const payload = message.payload;
        const text = payload.finalText ?? payload.translation?.finalText ?? "";
        showOverlay(text || "Перевод пуст");
      } else if (message?.type === "MULTITRANSLATE_ERROR") {
        showOverlay(`Ошибка перевода: ${message.payload}`, true);
      } else if (message?.type === "MULTITRANSLATE_START_AREA_SELECT") {
        startAreaSelection();
      }
    });
  },
});