export async function fetchImageConentTypeFromHttp(url: string) {
  try {
    const response = await fetch(url, {
      method: 'HEAD',
    });
    if (!response.ok) {
      throw new Error('HTTP request failed');
    }
    const contentType = getImageContentType(url, response.headers);
    const contentLength = response.headers.get('content-length');
    const fileSize = parseInt(contentLength ?? '0', 10);

    return { contentType, fileSize };
  } catch (err) {
    console.error('[get-pixels] Error fetching image content type', err);
    return { contentType: undefined, fileSize: undefined };
  }
}

export async function fetchImageFromHttp(url: string) {
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

/**
 * Helpers
 */
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
