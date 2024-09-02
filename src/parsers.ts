import ndarray from 'ndarray';
import { PNG } from 'pngjs';
import jpeg from 'jpeg-js';
import pack from 'ndarray-pack';
import { GifReader } from 'omggif';
import Bitmap from 'node-bitmap';
import { type Data, type Options } from './types';

export async function getParsedData(
  mimeType: string,
  data: Data,
  options: Options
) {
  switch (mimeType) {
    case 'image/png':
      return await getPngData(data);
    case 'image/jpg':
    case 'image/jpeg':
      return await getJpegData(data);
    case 'image/gif':
      return await getGifData(new Uint8Array(data), options);
    case 'image/bmp':
      return await getBmpData(data);
    default:
      throw new Error(`[get-pixels] Unsupported file type: ${mimeType}`);
  }
}

/**
 * Helpers
 */

async function getPngData(data: Data) {
  try {
    const imgData = await pngParseAsync(data);
    return ndarray(
      new Uint8Array(imgData.data),
      [imgData.width | 0, imgData.height | 0, 4],
      [4, (4 * imgData.width) | 0, 1],
      0
    );
  } catch (err) {
    console.error('[get-pixels] Error parsing PNG', err);
    throw new Error('[get-pixels] Error parsing PNG');
  }
}

async function getJpegData(data: Data) {
  try {
    const jpegData = jpeg.decode(data);
    if (!jpegData) {
      throw new Error('Error decoding jpeg');
    }
    const nshape = [jpegData.height, jpegData.width, 4];
    const result = ndarray(jpegData.data, nshape);
    return result.transpose(1, 0);
  } catch (err) {
    console.error('[get-pixels] Error parsing JPEG', err);
    throw new Error('[get-pixels] Error parsing JPEG');
  }
}

async function getBmpData(data: Data) {
  try {
    const bmp = new Bitmap(data as Buffer);
    bmp.init();
    const bmpData = bmp.getData();
    // @ts-expect-error - bmpData is not in the types
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
    const nshape = [bmpData.getHeight(), bmpData.getWidth(), 4];
    const ndata = new Uint8Array(nshape[0]! * nshape[1]! * nshape[2]!);
    const result = ndarray(ndata, nshape);
    pack(bmpData, result);
    return result.transpose(1, 0);
  } catch (err) {
    console.error('[get-pixels] Error parsing BMP', err);
    throw new Error('[get-pixels] Error parsing BMP');
  }
}

async function getGifData(data: Uint8Array, { maxGifFrames = -1 }: Options) {
  try {
    const reader = new GifReader(data);
    if (reader.numFrames() > 0) {
      const numFrames =
        maxGifFrames > 0
          ? Math.min(reader.numFrames(), maxGifFrames)
          : reader.numFrames();
      const nshape = [numFrames, reader.height, reader.width, 4];
      const ndata = new Uint8Array(
        nshape[0]! * nshape[1]! * nshape[2]! * nshape[3]!
      );
      const result = ndarray(ndata, nshape);
      for (let i = 0; i < numFrames; ++i) {
        reader.decodeAndBlitFrameRGBA(
          i,
          ndata.subarray(result.index(i, 0, 0, 0), result.index(i + 1, 0, 0, 0))
        );
      }
      return result.transpose(0, 2, 1);
    } else {
      const nshape = [reader.height, reader.width, 4];
      const ndata = new Uint8Array(nshape[0]! * nshape[1]! * nshape[2]!);
      const result = ndarray(ndata, nshape);
      reader.decodeAndBlitFrameRGBA(0, ndata);
      return result.transpose(1, 0);
    }
  } catch (err) {
    console.error('[get-pixels] Error parsing GIF', err);
    throw new Error('[get-pixels] Error parsing GIF');
  }
}

async function pngParseAsync(data: Data): Promise<PNG> {
  return new Promise(function (resolve, reject) {
    const png = new PNG();
    png.parse(data as Buffer, function (err, imgData: PNG) {
      if (err) reject(err);
      if (!imgData) reject(new Error('PNG image data is empty'));
      resolve(imgData);
    });
  });
}
