import { translateText, translateImageArea } from "../lib/api";
import { cropScreenshot, type SelectionRect } from "../lib/imageCrop";

async function getTargetLang(): Promise<string> {
  const { targetLang } = await browser.storage.sync.get("targetLang");
  return (targetLang as string | undefined) ?? "ru";
}

async function startAreaSelection(tabId: number) {
  await browser.tabs.sendMessage(tabId, { type: "MULTITRANSLATE_START_AREA_SELECT" });
}

async function handleAreaSelected(
  tabId: number,
  rect: SelectionRect,
  devicePixelRatio: number
) {
  try {
    const fullScreenshot = await browser.tabs.captureVisibleTab({ format: "png" });
    const croppedBase64 = await cropScreenshot(fullScreenshot, rect, devicePixelRatio);

    const targetLang = await getTargetLang();
    const result = await translateImageArea({ imageBase64: croppedBase64, targetLang });

    await browser.tabs.sendMessage(tabId, {
      type: result.translation
        ? "MULTITRANSLATE_RESULT"
        : "MULTITRANSLATE_ERROR",
      payload: result.translation ?? result.message ?? "Текст не распознан",
    });
  } catch (err) {
    await browser.tabs.sendMessage(tabId, {
      type: "MULTITRANSLATE_ERROR",
      payload: err instanceof Error ? err.message : String(err),
    });
  }
}

export default defineBackground(() => {
  browser.runtime.onInstalled.addListener(() => {
    browser.contextMenus.create({
      id: "multitranslate-selection",
      title: "Перевести через MultiTranslate",
      contexts: ["selection"],
    });
    browser.contextMenus.create({
      id: "multitranslate-area",
      title: "Перевести область экрана",
      contexts: ["page"],
    });
  });

  browser.contextMenus.onClicked.addListener(async (info, tab) => {
    if (!tab?.id) return;

    if (info.menuItemId === "multitranslate-selection" && info.selectionText) {
      try {
        const targetLang = await getTargetLang();
        const result = await translateText({ text: info.selectionText, targetLang });
        await browser.tabs.sendMessage(tab.id, { type: "MULTITRANSLATE_RESULT", payload: result });
      } catch (err) {
        await browser.tabs.sendMessage(tab.id, {
          type: "MULTITRANSLATE_ERROR",
          payload: err instanceof Error ? err.message : String(err),
        });
      }
    }

    if (info.menuItemId === "multitranslate-area") {
      await startAreaSelection(tab.id);
    }
  });

  // Глобальная горячая клавиша Alt+Shift+T (см. wxt.config.ts -> manifest.commands)
  browser.commands.onCommand.addListener(async (command) => {
    if (command !== "capture-area") return;
    const [activeTab] = await browser.tabs.query({ active: true, currentWindow: true });
    if (activeTab?.id) await startAreaSelection(activeTab.id);
  });

  // Сообщение от content script после того, как пользователь отрисовал прямоугольник
  browser.runtime.onMessage.addListener((message: any, sender) => {
    if (message?.type === "MULTITRANSLATE_AREA_SELECTED" && sender.tab?.id) {
      void handleAreaSelected(sender.tab.id, message.rect, message.devicePixelRatio);
    }
  });
});