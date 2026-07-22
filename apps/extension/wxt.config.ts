import { defineConfig } from "wxt";

export default defineConfig({
  manifest: {
    name: "MultiTranslate",
    description: "Агрегатор нескольких переводчиков с интеллектуальным анализом результатов",
    permissions: ["contextMenus", "storage", "activeTab"],
    host_permissions: ["<all_urls>"],
  },
  runner: {
    startUrls: ["https://example.com"],
  },
});