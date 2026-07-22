use serde::{Deserialize, Serialize};
use std::collections::HashMap;

#[derive(Serialize)]
struct OcrTranslateRequest {
    #[serde(rename = "imageBase64")]
    image_base64: String,
    #[serde(rename = "sourceLang")]
    source_lang: String,
    #[serde(rename = "targetLang")]
    target_lang: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    glossary: Option<HashMap<String, String>>,
}

#[derive(Deserialize, Clone)]
pub struct TranslationPayload {
    #[serde(rename = "finalText")]
    pub final_text: String,
    pub explanation: Option<String>,
}

#[derive(Deserialize)]
pub struct OcrTranslateResponse {
    #[serde(rename = "recognizedText")]
    pub recognized_text: String,
    pub translation: Option<TranslationPayload>,
    pub message: Option<String>,
}

/// Тот же контракт, что использует браузерное расширение (см.
/// apps/backend/src/routes/ocrTranslate.ts) — desktop и extension делят один backend.
pub async fn ocr_translate(
    backend_url: &str,
    image_base64: String,
    target_lang: String,
    glossary: Option<HashMap<String, String>>,
) -> Result<OcrTranslateResponse, String> {
    let client = reqwest::Client::new();

    let res = client
        .post(format!("{}/api/ocr-translate", backend_url.trim_end_matches('/')))
        .json(&OcrTranslateRequest {
            image_base64,
            source_lang: "auto".to_string(),
            target_lang,
            glossary,
        })
        .send()
        .await
        .map_err(|e| format!("Не удалось связаться с backend: {e}"))?;

    if !res.status().is_success() {
        let status = res.status();
        let body = res.text().await.unwrap_or_default();
        return Err(format!("Backend вернул ошибку {status}: {body}"));
    }

    res.json::<OcrTranslateResponse>()
        .await
        .map_err(|e| format!("Не удалось разобрать ответ backend: {e}"))
}