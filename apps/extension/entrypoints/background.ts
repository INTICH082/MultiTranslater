import { translateText } from "../lib/api";

export default defineBackground(() => {
  browser.runtime.onInstalled.addListener(() => {
    browser.contextMenus.create({
      id: "multitranslate-selection",
      title: "Перевести через MultiTranslate",
      contexts: ["selection"],
    });
  });

  browser.contextMenus.onClicked.addListener(async (info, tab) => {
    if (info.menuItemId !== "multitranslate-selection" || !info.selectionText || !tab?.id) return;

    try {
      const { targetLang } = await browser.storage.sync.get("targetLang");
      const result = await translateText({
        text: info.selectionText,
        targetLang: (targetLang as string | undefined) ?? "ru",
      });

      await browser.tabs.sendMessage(tab.id, {
        type: "MULTITRANSLATE_RESULT",
        payload: result,
      });
    } catch (err) {
      await browser.tabs.sendMessage(tab.id, {
        type: "MULTITRANSLATE_ERROR",
        payload: err instanceof Error ? err.message : String(err),
      });
    }
  });
});