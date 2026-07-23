import { invoke } from "@tauri-apps/api/core";

export interface Settings {
  backendUrl: string;
  targetLang: string;
  glossary: Record<string, string>;
  enabledProviders: string[];
}

export const getSettings = () => invoke<Settings>("get_settings");

export const updateSettings = (settings: Settings) =>
  invoke<void>("update_settings", { newSettings: settings });

export const startAreaSelection = () => invoke<void>("start_area_selection");

export const cancelAreaSelection = () => invoke<void>("cancel_area_selection");

export const areaSelected = (rect: { x: number; y: number; width: number; height: number }) =>
  invoke<void>("area_selected", { x: rect.x, y: rect.y, width: rect.width, height: rect.height });

export const closeResultWindow = () => invoke<void>("close_result_window");