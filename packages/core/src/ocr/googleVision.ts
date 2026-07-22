import type { OcrProvider } from "./types.js";

export function createGoogleVisionOcr(apiKey: string): OcrProvider {
  return {
    id: "google-vision",
    async recognize(imageBase64: string): Promise<string> {
      const url = `https://vision.googleapis.com/v1/images:annotate?key=${apiKey}`;

      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requests: [
            {
              image: { content: imageBase64 },
              features: [{ type: "TEXT_DETECTION" }],
            },
          ],
        }),
      });

      if (!res.ok) {
        throw new Error(`Google Vision HTTP ${res.status}: ${await res.text()}`);
      }

      const data = (await res.json()) as {
        responses: { fullTextAnnotation?: { text: string }; error?: { message: string } }[];
      };

      const first = data.responses[0];
      if (first?.error) {
        throw new Error(`Google Vision: ${first.error.message}`);
      }

      return first?.fullTextAnnotation?.text?.trim() ?? "";
    },
  };
}