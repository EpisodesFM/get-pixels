export type Options = {
  type?: string;
  maxGifFrames?: number;
  resize?: { width?: number; height?: number };
};
export type Data = Buffer | ArrayBuffer;
export type JimpMimeType =
  | 'image/bmp'
  | 'image/tiff'
  | 'image/x-ms-bmp'
  | 'image/gif'
  | 'image/jpeg'
  | 'image/png';
