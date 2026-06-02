import { Readable } from 'stream';
import { FileVisibility } from '@prisma/client';

export interface StorageObject {
  stream: Readable;
  contentType?: string;
  contentLength?: number;
}

export interface UploadObjectInput {
  key: string;
  file: Buffer;
  mimeType: string;
  visibility: FileVisibility;
  cacheControl?: string;
  contentDisposition?: string;
}

export interface UploadObjectResult {
  key: string;
  bucket: string;
  etag?: string;
}

export interface StorageObjectHead {
  key: string;
  bucket: string;
  contentType?: string;
  contentLength?: number;
  etag?: string;
  lastModified?: Date;
}

export interface StorageProvider {
  upload(input: UploadObjectInput): Promise<UploadObjectResult>;
  delete(key: string): Promise<void>;
  exists(key: string): Promise<boolean>;
  getPublicUrl(key: string): string;
  getSignedUrl(key: string, expiresInSeconds: number, options?: { downloadName?: string }): Promise<string>;
  copy(sourceKey: string, targetKey: string): Promise<void>;
  move(sourceKey: string, targetKey: string): Promise<void>;
  head(key: string): Promise<StorageObjectHead | null>;
  getObject(key: string): Promise<StorageObject>;
  getBucketName(): string;
}

export const STORAGE_PROVIDER = 'STORAGE_PROVIDER';
