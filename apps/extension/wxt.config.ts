import { defineConfig } from "wxt";

export default defineConfig({
  manifest: {
    name: "MultiTranslate",
    description: "Агрегатор нескольких переводчиков с интеллектуальным анализом результатов",
    permissions: ["contextMenus", "storage", "activeTab", "tabs"],
    host_permissions: ["<all_urls>"],
    commands: {
      "capture-area": {
        suggested_key: { default: "Alt+Shift+T" },
        description: "Перевести выделенную область экрана",
      },
    },
  },
  runner: {
    startUrls: ["https://example.com"],
  },
});