export type ImageType = 'image/png' | 'image/jpg' | 'image/jpeg' | 'image/gif';
export type Options = {
  maxGifFrames?: number;
  resize?: { width?: number; height?: number };
};
export type Data = Buffer | ArrayBuffer;
