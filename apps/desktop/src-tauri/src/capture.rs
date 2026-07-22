use base64::{engine::general_purpose::STANDARD, Engine as _};
use image::DynamicImage;
use std::io::Cursor;
use xcap::Monitor;

pub fn capture_area_as_base64_png(x: i32, y: i32, width: u32, height: u32) -> Result<String, String> {
    if width == 0 || height == 0 {
        return Err("Пустая область выделения".to_string());
    }

    let monitors = Monitor::all().map_err(|e| format!("Не удалось получить список экранов: {e}"))?;

    // Находим экран, на котором находится точка (x, y) — важно для мультимониторных
    // конфигураций, т.к. глобальные координаты не начинаются с (0,0) для вторых мониторов.
    let monitor = monitors
        .into_iter()
        .find(|m| {
            let mx = m.x().unwrap_or(0);
            let my = m.y().unwrap_or(0);
            let mw = m.width().unwrap_or(0) as i32;
            let mh = m.height().unwrap_or(0) as i32;
            x >= mx && y >= my && x < mx + mw && y < my + mh
        })
        .ok_or_else(|| "Не найден экран для указанных координат".to_string())?;

    let local_x = x - monitor.x().map_err(|e| e.to_string())?;
    let local_y = y - monitor.y().map_err(|e| e.to_string())?;

    // capture_region берёт координаты уже относительно самого монитора
    let rgba = monitor
        .capture_region(local_x, local_y, width, height)
        .map_err(|e| format!("Ошибка захвата экрана: {e}"))?;

    let mut png_bytes: Vec<u8> = Vec::new();
    DynamicImage::ImageRgba8(rgba)
        .write_to(&mut Cursor::new(&mut png_bytes), image::ImageFormat::Png)
        .map_err(|e| format!("Ошибка кодирования PNG: {e}"))?;

    Ok(STANDARD.encode(png_bytes))
}