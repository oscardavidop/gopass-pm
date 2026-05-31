import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createReadStream, promises as fs } from 'fs';
import { dirname, join, resolve } from 'path';

import { StorageProvider } from './storage.provider';

@Injectable()
export class LocalStorageProvider implements StorageProvider {
  private readonly rootDir: string;

  constructor(private readonly config: ConfigService) {
    const configured = this.config.get<string>('UPLOADS_LOCAL_ROOT', 'storage/uploads');
    this.rootDir = resolve(process.cwd(), configured);
  }

  async upload(file: Buffer, path: string): Promise<void> {
    const absolute = this.toAbsolutePath(path);
    await fs.mkdir(dirname(absolute), { recursive: true });
    await fs.writeFile(absolute, file);
  }

  async delete(path: string): Promise<void> {
    const absolute = this.toAbsolutePath(path);
    await fs.rm(absolute, { force: true });
  }

  getUrl(path: string): string {
    const normalized = path.replace(/\\/g, '/');
    return `/uploads-storage/${normalized}`;
  }

  async getObject(path: string) {
    const absolute = this.toAbsolutePath(path);
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

  private toAbsolutePath(path: string) {
    const normalized = path.replace(/\\/g, '/').replace(/^\/+/, '');
    return join(this.rootDir, normalized);
  }
}
