import { promises as fs } from 'fs';
import mime from 'mime-types';
import parseDataURI from 'parse-data-uri';
import { Jimp } from 'jimp';
import { type NdArray } from 'ndarray';

import { getParsedData } from './parsers';
import { type JimpMimeType, type Options } from './types';
import { fetchImageConentTypeFromHttp, fetchImageFromHttp } from './utils';

export * from './types';

export async function getPixels(
  url: string | Buffer,
  options?: Options
): Promise<NdArray<Uint8Array>> {
  const {
    maxGifFrames = -1,
    resize,
    type,
    maxSize = 2 * 1024 * 1024,
  } = options ?? {};
  const opts = { maxGifFrames, resize, type, maxSize };
  const isBuffer = Buffer.isBuffer(url);
  const isHttp =
    !isBuffer && (url.startsWith('http://') || url.startsWith('https://'));
  const isDataUri = !isBuffer && url.startsWith('data:');
  const shouldResize = !!resize && (!!resize.width || !!resize.height);

  if (shouldResize && !isHttp) {
    console.warn(
      '[get-pixels] Resize is only supported for http(s) images, ignoring resize option'
    );
  }

  if (Buffer.isBuffer(url)) {
    return getPixelsFromBuffer(url, opts);
  }

  if (shouldResize && isHttp) {
    return getPixelsFromResizedImage(url, opts);
  }
  if (isDataUri) {
    return getPixelsFromDataUri(url, opts);
  }
  if (isHttp) {
    return getPixelsFromHttp(url, opts);
  }
  return getPixelsFromFile(url, opts);
}

/**
 * Helpers
 */
async function getPixelsFromResizedImage(url: string, options: Options) {
  const { contentType, data, fileSize } = await getResizedImage(
    url,
    options.resize!
  );
  const shouldAbort = !data && fileSize && fileSize > options.maxSize!;
  if (shouldAbort) {
    throw new Error(
      `[get-pixels] Resize failed and image is too large (${fileSize} bytes). Aborting.`
    );
  }
  return !!data
    ? getPixelsFromBuffer(data, {
        ...options,
        type: contentType ?? options.type,
      })
    : getPixelsFromHttp(url, options);
}

async function getPixelsFromBuffer(data: Buffer, options: Options) {
  if (!options.type) {
    throw new Error(
      '[get-pixels] Invalid file type. Mime type is required for buffers.'
    );
  }
  return await getParsedData(options.type, data, options);
}

async function getPixelsFromDataUri(url: string, options: Options) {
  try {
    const buffer = parseDataURI(url);
    if (buffer) {
      return await getParsedData(
        options.type ?? buffer.mimeType,
        buffer.data,
        options
      );
    } else {
      throw new Error('[get-pixels] Error parsing data URI');
    }
  } catch (err) {
    console.error('[get-pixels] Error parsing data URI', err);
    throw new Error('[get-pixels] Error parsing data URI');
  }
}

async function getPixelsFromHttp(url: string, options: Options) {
  try {
    const { contentType, data } = await fetchImageFromHttp(url);
    return await getParsedData(contentType, data, options);
  } catch (err) {
    console.error('[get-pixels] Error getting pixels from http image', err);
    throw new Error('[get-pixels] Error getting pixels from http image');
  }
}

async function getPixelsFromFile(url: string, options: Options) {
  try {
    const data = await fs.readFile(url);
    const mimeType = mime.lookup(url);
    if (!mimeType) throw new Error('Invalid file type');
    return await getParsedData(mimeType, data, options);
  } catch (err) {
    console.error('[get-pixels] Error reading file', err);
    throw new Error('[get-pixels] Error reading file');
  }
}

async function getResizedImage(
  url: string,
  size: { width?: number; height?: number }
) {
  const w = size.width ?? size.height ?? 256;
  const h = size.height ?? size.width ?? 256;
  const jimpMimetypes = [
    'image/bmp',
    'image/tiff',
    'image/x-ms-bmp',
    'image/gif',
    'image/jpeg',
    'image/png',
  ];
  const { contentType, fileSize } = await fetchImageConentTypeFromHttp(url);
  try {
    if (!contentType || !jimpMimetypes.includes(contentType)) {
      throw new Error(`Unsupported image type ${contentType}`);
    }
    const resizedBuffer = await (await Jimp.read(url))
      .resize({ w, h })
      .getBuffer(contentType as JimpMimeType);
    if (!resizedBuffer) {
      throw new Error('Error resizing image');
    }
    return { contentType, data: resizedBuffer, fileSize };
  } catch (err) {
    console.error('[get-pixels] Error resizing image', err);
    return { contentType, data: undefined, fileSize };
  }
}
