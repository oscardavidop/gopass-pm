import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { Readable } from 'stream';

import { StorageProvider } from './storage.provider';

@Injectable()
export class S3StorageProvider implements StorageProvider {
  private readonly client: S3Client;
  private readonly bucket: string;
  private readonly publicBaseUrl: string;

  constructor(private readonly config: ConfigService) {
    this.bucket = this.config.get<string>('UPLOADS_S3_BUCKET', '');
    const endpoint = this.config.get<string>('UPLOADS_S3_ENDPOINT', '');
    const region = this.config.get<string>('UPLOADS_S3_REGION', 'auto');
    const accessKeyId = this.config.get<string>('UPLOADS_S3_ACCESS_KEY', '');
    const secretAccessKey = this.config.get<string>('UPLOADS_S3_SECRET_KEY', '');
    this.publicBaseUrl = this.config.get<string>('UPLOADS_S3_PUBLIC_BASE_URL', '').replace(/\/$/, '');

    this.client = new S3Client({
      region,
      endpoint: endpoint || undefined,
      forcePathStyle: this.config.get<string>('UPLOADS_S3_FORCE_PATH_STYLE', 'true') === 'true',
      credentials: accessKeyId && secretAccessKey ? { accessKeyId, secretAccessKey } : undefined,
    });

  }

  async upload(file: Buffer, path: string, mimeType: string): Promise<void> {
    this.ensureConfigured();
    await this.client.send(new PutObjectCommand({
      Bucket: this.bucket,
      Key: path,
      Body: file,
      ContentType: mimeType,
    }));
  }

  async delete(path: string): Promise<void> {
    this.ensureConfigured();
    await this.client.send(new DeleteObjectCommand({
      Bucket: this.bucket,
      Key: path,
    }));
  }

  getUrl(path: string): string {
    if (this.publicBaseUrl) {
      return `${this.publicBaseUrl}/${path}`;
    }
    return `s3://${this.bucket}/${path}`;
  }

  async getObject(path: string) {
    this.ensureConfigured();
    const response = await this.client.send(new GetObjectCommand({
      Bucket: this.bucket,
      Key: path,
    }));

    const body = response.Body;
    if (!body || !(body instanceof Readable)) {
      throw new InternalServerErrorException('Unable to stream file');
    }

    return {
      stream: body,
      contentType: response.ContentType,
      contentLength: response.ContentLength,
    };
  }

  private ensureConfigured() {
    if (!this.bucket) {
      throw new InternalServerErrorException('UPLOADS_S3_BUCKET is required for s3 storage');
    }
  }
}
