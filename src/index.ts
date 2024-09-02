import { promises as fs } from 'fs';
import mime from 'mime-types';
import parseDataURI from 'parse-data-uri';

import { Jimp } from 'jimp';
import { type NdArray } from 'ndarray';
import { getParsedData } from './parsers';
import { type JimpMimeType, type Options } from './types';

export * from './types';

export async function getPixels(
  url: string,
  options?: Options
): Promise<NdArray<Uint8Array>> {
  const { maxGifFrames = -1, resize, type } = options ?? {};
  const opts = { maxGifFrames, resize, type };
  const shouldResize = !!resize && (!!resize.width || !!resize.height);
  const isBuffer = Buffer.isBuffer(url);
  const isHttp = url.startsWith('http://') || url.startsWith('https://');
  const isDataUri = url.startsWith('data:');

  if (shouldResize) {
    const { contentType, data } = await getResizedImage(url, resize);
    return getPixelsFromBuffer(data, { ...opts, type: contentType ?? type });
  }

  if (isBuffer) {
    return getPixelsFromBuffer(url, opts);
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
async function getPixelsFromBuffer(url: Buffer, options: Options) {
  if (!options.type) {
    throw new Error(
      '[get-pixels] Invalid file type. Mime type is required for buffers.'
    );
  }
  return await getParsedData(options.type, url, options);
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

function getImageContentType(url: string, headers: Headers) {
  let contentType;
  contentType = headers.get('content-type');
  if (!contentType) {
    throw new Error('Invalid content-type');
  }
  if (contentType === 'image/*') {
    const ext = url.split(/[#?]/)[0]?.split('.').pop()?.trim();
    contentType = `image/${ext?.toLowerCase()}`;
  }
  if (contentType === 'image/jpg') {
    contentType = 'image/jpeg';
  }
  return contentType;
}

async function fetchImageFromHttp(url: string) {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error('HTTP request failed');
    }
    const contentType = getImageContentType(url, response.headers);
    const data = await response.arrayBuffer();
    return { contentType, data };
  } catch (err) {
    console.error('[get-pixels] Error fetching image', err);
    throw new Error('[get-pixels] Error fetching image');
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
  try {
    const { contentType, data } = await fetchImageFromHttp(url);
    if (!jimpMimetypes.includes(contentType)) {
      throw new Error(`Unsupported image type ${contentType}`);
    }
    const image = (await Jimp.fromBuffer(data)).resize({ w, h });
    const resizedBuffer = await image.getBuffer(contentType as JimpMimeType);

    return { contentType, data: resizedBuffer };
  } catch (err) {
    console.error('[get-pixels] Error resizing image', err);
    throw new Error('[get-pixels] Error resizing image');
  }
}
