declare module 'spark-md5' {
  class SparkMD5 {
    static hash(str: string): string;
    static hashBinary(data: ArrayBuffer | Uint8Array): string;
    static ArrayBuffer(arrayBuffer: ArrayBuffer): string;
    append(str: string): void;
    appendBinary(data: ArrayBuffer | Uint8Array): void;
    end(raw?: boolean): string;
    reset(): void;
    getState(): any;
    setState(state: any): void;
    destroy(): void;
  }
  export = SparkMD5;
}