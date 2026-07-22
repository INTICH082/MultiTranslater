export interface SelectionRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export async function cropScreenshot(
  fullScreenshotDataUrl: string,
  rect: SelectionRect,
  devicePixelRatio: number
): Promise<string> {
  const blob = await (await fetch(fullScreenshotDataUrl)).blob();
  const bitmap = await createImageBitmap(blob);

  const sx = Math.max(0, Math.round(rect.x * devicePixelRatio));
  const sy = Math.max(0, Math.round(rect.y * devicePixelRatio));
  const sw = Math.round(rect.width * devicePixelRatio);
  const sh = Math.round(rect.height * devicePixelRatio);

  const canvas = new OffscreenCanvas(sw, sh);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Не удалось получить 2D-контекст OffscreenCanvas");

  ctx.drawImage(bitmap, sx, sy, sw, sh, 0, 0, sw, sh);

  const outBlob = await canvas.convertToBlob({ type: "image/png" });
  return blobToBase64(outBlob);
}

async function blobToBase64(blob: Blob): Promise<string> {
  const buffer = new Uint8Array(await blob.arrayBuffer());
  const chunkSize = 0x8000;
  let binary = "";
  for (let i = 0; i < buffer.length; i += chunkSize) {
    binary += String.fromCharCode(...buffer.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}