import { Readable } from 'stream';

export interface StorageObject {
  stream: Readable;
  contentType?: string;
  contentLength?: number;
}

export interface StorageProvider {
  upload(file: Buffer, path: string, mimeType: string): Promise<void>;
  delete(path: string): Promise<void>;
  getUrl(path: string): string;
  getObject(path: string): Promise<StorageObject>;
}

export const STORAGE_PROVIDER = 'STORAGE_PROVIDER';
