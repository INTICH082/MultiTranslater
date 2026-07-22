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

    browser.runtime.onMessage.addListener((message: any) => {
      if (message?.type === "MULTITRANSLATE_RESULT") {
        showOverlay(message.payload.finalText);
      } else if (message?.type === "MULTITRANSLATE_ERROR") {
        showOverlay(`Ошибка перевода: ${message.payload}`, true);
      }
    });
  },
});