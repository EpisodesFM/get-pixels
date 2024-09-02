

declare module 'ndarray-pack' {
  import { type NdArray } from "ndarray";
  export default function pack(data: unknown[], result: NdArray): void;
}