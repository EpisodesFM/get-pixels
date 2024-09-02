
declare module 'parse-data-uri' {
  export default function parseDataUri(dataUri: string): {
    mimeType: string;
    data: Buffer;
  };
}