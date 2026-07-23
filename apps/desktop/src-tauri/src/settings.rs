use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fs;
use std::path::PathBuf;
use std::sync::Mutex;
use tauri::{AppHandle, Manager};

#[derive(Serialize, Deserialize, Clone)]
pub struct Settings {
    #[serde(rename = "backendUrl")]
    pub backend_url: String,
    #[serde(rename = "targetLang")]
    pub target_lang: String,
    pub glossary: HashMap<String, String>,
    #[serde(rename = "enabledProviders", default)]
    pub enabled_providers: Vec<String>,
}

impl Default for Settings {
    fn default() -> Self {
        Self {
            backend_url: "http://localhost:8787".to_string(),
            target_lang: "ru".to_string(),
            glossary: HashMap::new(),
            enabled_providers: Vec::new(),
        }
    }
}

pub struct SettingsState(pub Mutex<Settings>);

fn settings_path(app: &AppHandle) -> Result<PathBuf, String> {
    let dir = app
        .path()
        .app_config_dir()
        .map_err(|e| format!("Нет доступа к конфигурационной директории: {e}"))?;
    fs::create_dir_all(&dir).map_err(|e| format!("Не удалось создать конфигурационную директорию: {e}"))?;
    Ok(dir.join("settings.json"))
}

pub fn load_settings(app: &AppHandle) -> Settings {
    settings_path(app)
        .ok()
        .and_then(|path| fs::read_to_string(path).ok())
        .and_then(|content| serde_json::from_str(&content).ok())
        .unwrap_or_default()
}

pub fn save_settings(app: &AppHandle, settings: &Settings) -> Result<(), String> {
    let path = settings_path(app)?;
    let content = serde_json::to_string_pretty(settings).map_err(|e| e.to_string())?;
    fs::write(path, content).map_err(|e| format!("Не удалось сохранить настройки: {e}"))
}