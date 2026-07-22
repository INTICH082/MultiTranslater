export interface OcrProvider {
  readonly id: string;
  recognize(imageBase64: string): Promise<string>;
}