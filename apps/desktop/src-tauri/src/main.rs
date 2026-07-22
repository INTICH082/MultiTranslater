mod backend_client;
mod capture;
mod settings;

use settings::{load_settings, save_settings, Settings, SettingsState};
use std::sync::Mutex;
use tauri::{AppHandle, Manager, WebviewUrl, WebviewWindowBuilder};
use tauri_plugin_global_shortcut::{Code, GlobalShortcutExt, Modifiers, Shortcut, ShortcutState};

const SELECTION_LABEL: &str = "selection";
const RESULT_LABEL: &str = "result";

/// Открывает поверх текущего (основного) монитора прозрачное окно для выделения
/// прямоугольной области. Сам процесс выделения (drag мышью) реализован во
/// фронтенде — см. src/windows/SelectionWindow.tsx.
fn open_selection_window(app: &AppHandle) -> Result<(), String> {
    if let Some(existing) = app.get_webview_window(SELECTION_LABEL) {
        let _ = existing.set_focus();
        return Ok(());
    }

    let monitor = app
        .primary_monitor()
        .map_err(|e| e.to_string())?
        .ok_or_else(|| "Не удалось определить основной монитор".to_string())?;

    let position = monitor.position();
    let size = monitor.size();

    WebviewWindowBuilder::new(app, SELECTION_LABEL, WebviewUrl::App("index.html#/selection".into()))
        .transparent(true)
        .decorations(false)
        .always_on_top(true)
        .skip_taskbar(true)
        .resizable(false)
        .position(position.x as f64, position.y as f64)
        .inner_size(size.width as f64, size.height as f64)
        .build()
        .map_err(|e| format!("Не удалось открыть окно выделения: {e}"))?;

    Ok(())
}

#[tauri::command]
fn start_area_selection(app: AppHandle) -> Result<(), String> {
    open_selection_window(&app)
}

#[tauri::command]
fn cancel_area_selection(app: AppHandle) -> Result<(), String> {
    if let Some(win) = app.get_webview_window(SELECTION_LABEL) {
        let _ = win.close();
    }
    Ok(())
}

/// Вызывается фронтендом окна выделения после того, как пользователь отпустил мышь.
/// Координаты уже переведены в абсолютные физические пиксели экрана (см. комментарий
/// в SelectionWindow.tsx: outerPosition + clientXY * scaleFactor).
#[tauri::command]
async fn area_selected(
    app: AppHandle,
    state: tauri::State<'_, SettingsState>,
    x: i32,
    y: i32,
    width: u32,
    height: u32,
) -> Result<(), String> {
    if let Some(win) = app.get_webview_window(SELECTION_LABEL) {
        let _ = win.close();
    }

    let settings = state.0.lock().map_err(|_| "Настройки заблокированы".to_string())?.clone();

    let image_base64 = capture::capture_area_as_base64_png(x, y, width, height)?;

    let glossary = if settings.glossary.is_empty() {
        None
    } else {
        Some(settings.glossary.clone())
    };

    let result = backend_client::ocr_translate(
        &settings.backend_url,
        image_base64,
        settings.target_lang.clone(),
        glossary,
    )
    .await;

    let (text, is_error) = match result {
        Ok(response) => match response.translation {
            Some(t) => (t.final_text, false),
            None => (
                response.message.unwrap_or_else(|| "Текст не распознан".to_string()),
                true,
            ),
        },
        Err(e) => (e, true),
    };

    open_result_window(&app, x, y + height as i32, &text, is_error)
}

fn open_result_window(
    app: &AppHandle,
    near_x: i32,
    near_y: i32,
    text: &str,
    is_error: bool,
) -> Result<(), String> {
    if let Some(existing) = app.get_webview_window(RESULT_LABEL) {
        let _ = existing.close();
    }

    let encoded_text = urlencoding::encode(text);
    let url = format!(
        "index.html#/result?text={}&error={}",
        encoded_text,
        is_error
    );

    WebviewWindowBuilder::new(app, RESULT_LABEL, WebviewUrl::App(url.into()))
        .transparent(true)
        .decorations(false)
        .always_on_top(true)
        .skip_taskbar(true)
        .resizable(false)
        .position(near_x as f64, (near_y + 8) as f64)
        .inner_size(380.0, 160.0)
        .build()
        .map_err(|e| format!("Не удалось открыть окно результата: {e}"))?;

    Ok(())
}

#[tauri::command]
fn close_result_window(app: AppHandle) -> Result<(), String> {
    if let Some(win) = app.get_webview_window(RESULT_LABEL) {
        let _ = win.close();
    }
    Ok(())
}

#[tauri::command]
fn get_settings(state: tauri::State<'_, SettingsState>) -> Result<Settings, String> {
    state.0.lock().map(|s| s.clone()).map_err(|_| "Настройки заблокированы".to_string())
}

#[tauri::command]
fn update_settings(
    app: AppHandle,
    state: tauri::State<'_, SettingsState>,
    new_settings: Settings,
) -> Result<(), String> {
    save_settings(&app, &new_settings)?;
    *state.0.lock().map_err(|_| "Настройки заблокированы".to_string())? = new_settings;
    Ok(())
}

fn main() {
    tauri::Builder::default()
        .plugin(
            tauri_plugin_global_shortcut::Builder::new()
                .with_handler(|app, shortcut, event| {
                    // Реагируем только на нажатие (не на отпускание клавиши)
                    if event.state == ShortcutState::Pressed {
                        let alt_shift_t = Shortcut::new(
                            Some(Modifiers::ALT | Modifiers::SHIFT),
                            Code::KeyT,
                        );
                        if shortcut == &alt_shift_t {
                            let _ = open_selection_window(app);
                        }
                    }
                })
                .build(),
        )
        .setup(|app| {
            let handle = app.handle();
            let initial_settings = load_settings(handle);
            app.manage(SettingsState(Mutex::new(initial_settings)));

            let shortcut = Shortcut::new(Some(Modifiers::ALT | Modifiers::SHIFT), Code::KeyT);
            app.global_shortcut().register(shortcut)?;

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            start_area_selection,
            cancel_area_selection,
            area_selected,
            close_result_window,
            get_settings,
            update_settings,
        ])
        .run(tauri::generate_context!())
        .expect("Ошибка запуска MultiTranslate desktop");
}