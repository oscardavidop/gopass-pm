import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createReadStream, promises as fs } from 'fs';
import { dirname, join, resolve } from 'path';

import { StorageProvider, StorageObjectHead, UploadObjectInput, UploadObjectResult } from './storage.provider';

@Injectable()
export class LocalStorageProvider implements StorageProvider {
  private readonly rootDir: string;
  private readonly bucketName: string;

  constructor(private readonly config: ConfigService) {
    const configured = this.config.get<string>('UPLOADS_LOCAL_ROOT', 'storage/uploads');
    this.rootDir = resolve(process.cwd(), configured);
    this.bucketName = this.config.get<string>('UPLOADS_S3_BUCKET', 'local-storage');
  }

  async upload(input: UploadObjectInput): Promise<UploadObjectResult> {
    const absolute = this.toAbsolutePath(input.key);
    await fs.mkdir(dirname(absolute), { recursive: true });
    await fs.writeFile(absolute, input.file);
    return {
      key: input.key,
      bucket: this.bucketName,
    };
  }

  async delete(key: string): Promise<void> {
    const absolute = this.toAbsolutePath(key);
    await fs.rm(absolute, { force: true });
  }

  async exists(key: string): Promise<boolean> {
    try {
      await fs.access(this.toAbsolutePath(key));
      return true;
    } catch {
      return false;
    }
  }

  getPublicUrl(key: string): string {
    const normalized = key.replace(/\\/g, '/');
    return `/uploads-storage/${normalized}`;
  }

  async getSignedUrl(key: string): Promise<string> {
    return this.getPublicUrl(key);
  }

  async copy(sourceKey: string, targetKey: string): Promise<void> {
    const source = this.toAbsolutePath(sourceKey);
    const target = this.toAbsolutePath(targetKey);
    await fs.mkdir(dirname(target), { recursive: true });
    await fs.copyFile(source, target);
  }

  async move(sourceKey: string, targetKey: string): Promise<void> {
    const source = this.toAbsolutePath(sourceKey);
    const target = this.toAbsolutePath(targetKey);
    await fs.mkdir(dirname(target), { recursive: true });
    await fs.rename(source, target);
  }

  async head(key: string): Promise<StorageObjectHead | null> {
    try {
      const stat = await fs.stat(this.toAbsolutePath(key));
      return {
        key,
        bucket: this.bucketName,
        contentLength: stat.size,
        lastModified: stat.mtime,
      };
    } catch {
      return null;
    }
  }

  async getObject(key: string) {
    const absolute = this.toAbsolutePath(key);
    try {
      const stat = await fs.stat(absolute);
      return {
        stream: createReadStream(absolute),
        contentLength: stat.size,
      };
    } catch {
      throw new NotFoundException('File not found');
    }
  }

  getBucketName(): string {
    return this.bucketName;
  }

  private toAbsolutePath(path: string) {
    const normalized = path.replace(/\\/g, '/').replace(/^\/+/, '');
    return join(this.rootDir, normalized);
  }
}
