
declare module 'node-bitmap' {
  export default class Bitmap {
    constructor(data: Buffer);
    init(): void;
    getData(): unknown[];
  }
}