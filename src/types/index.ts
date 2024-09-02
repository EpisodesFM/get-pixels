export type Options = {
  type?: string;
  maxGifFrames?: number;
  // only for http(s) images. Defaults to 256x256
  resize?: { width?: number; height?: number };
  // in bytes. Defaults to 2MB
  maxSize?: number;
};
export type Data = Buffer | ArrayBuffer;
export type JimpMimeType =
  | 'image/bmp'
  | 'image/tiff'
  | 'image/x-ms-bmp'
  | 'image/gif'
  | 'image/jpeg'
  | 'image/png';
