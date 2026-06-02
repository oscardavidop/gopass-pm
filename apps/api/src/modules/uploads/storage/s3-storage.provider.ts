import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  CopyObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Readable } from 'stream';
import { FileVisibility } from '@prisma/client';

import { StorageProvider, StorageObjectHead, UploadObjectInput, UploadObjectResult } from './storage.provider';

@Injectable()
export class S3StorageProvider implements StorageProvider {
  private readonly client: S3Client;
  private readonly bucket: string;
  private readonly publicBaseUrl: string;
  private readonly endpoint: string;
  private readonly region: string;

  constructor(private readonly config: ConfigService) {
    this.bucket = this.config.get<string>('UPLOADS_S3_BUCKET', '');
    this.endpoint = this.config.get<string>('UPLOADS_S3_ENDPOINT', '');
    this.region = this.config.get<string>('UPLOADS_S3_REGION', 'us-east-1');
    const accessKeyId = this.config.get<string>('UPLOADS_S3_ACCESS_KEY', '');
    const secretAccessKey = this.config.get<string>('UPLOADS_S3_SECRET_KEY', '');
    this.publicBaseUrl = this.config.get<string>('UPLOADS_S3_PUBLIC_BASE_URL', '').replace(/\/$/, '');

    this.client = new S3Client({
      region: this.region,
      endpoint: this.endpoint || undefined,
      forcePathStyle: this.config.get<string>('UPLOADS_S3_FORCE_PATH_STYLE', 'false') === 'true',
      credentials: accessKeyId && secretAccessKey ? { accessKeyId, secretAccessKey } : undefined,
    });

  }

  async upload(input: UploadObjectInput): Promise<UploadObjectResult> {
    this.ensureConfigured();

    const response = await this.client.send(new PutObjectCommand({
      Bucket: this.bucket,
      Key: input.key,
      Body: input.file,
      ContentType: input.mimeType,
      CacheControl: input.cacheControl,
      ContentDisposition: input.contentDisposition,
      // ACL: input.visibility === FileVisibility.PUBLIC ? 'public-read' : undefined,
    }));

    return {
      key: input.key,
      bucket: this.bucket,
      etag: response.ETag?.replace(/"/g, ''),
    };
  }

  async delete(key: string): Promise<void> {
    this.ensureConfigured();
    await this.client.send(new DeleteObjectCommand({
      Bucket: this.bucket,
      Key: key,
    }));
  }

  async exists(key: string): Promise<boolean> {
    const meta = await this.head(key);
    return !!meta;
  }

  getPublicUrl(key: string): string {
    if (this.publicBaseUrl) {
      return `${this.publicBaseUrl}/${encodeURI(key)}`;
    }
    if (this.endpoint) {
      const normalized = this.endpoint.replace(/\/$/, '');
      return `${normalized}/${this.bucket}/${encodeURI(key)}`;
    }
    return `https://${this.bucket}.s3.${this.region}.amazonaws.com/${encodeURI(key)}`;
  }

  async getSignedUrl(key: string, expiresInSeconds: number, options?: { downloadName?: string }): Promise<string> {
    this.ensureConfigured();
    return getSignedUrl(
      this.client,
      new GetObjectCommand({
        Bucket: this.bucket,
        Key: key,
        // ResponseContentDisposition: options?.downloadName
        //   ? `attachment; filename="${options.downloadName.replace(/[^a-zA-Z0-9._-]/g, '_')}"`
        //   : undefined,
      }),
      { expiresIn: expiresInSeconds },
    );
  }

  async copy(sourceKey: string, targetKey: string): Promise<void> {
    this.ensureConfigured();
    await this.client.send(new CopyObjectCommand({
      Bucket: this.bucket,
      Key: targetKey,
      CopySource: `${this.bucket}/${encodeURI(sourceKey)}`,
    }));
  }

  async move(sourceKey: string, targetKey: string): Promise<void> {
    await this.copy(sourceKey, targetKey);
    await this.delete(sourceKey);
  }

  async head(key: string): Promise<StorageObjectHead | null> {
    this.ensureConfigured();
    try {
      const response = await this.client.send(new HeadObjectCommand({
        Bucket: this.bucket,
        Key: key,
      }));
      return {
        key,
        bucket: this.bucket,
        contentLength: response.ContentLength,
        contentType: response.ContentType,
        etag: response.ETag?.replace(/"/g, ''),
        lastModified: response.LastModified,
      };
    } catch {
      return null;
    }
  }

  async getObject(key: string) {
    this.ensureConfigured();
    const response = await this.client.send(new GetObjectCommand({
      Bucket: this.bucket,
      Key: key,
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

  getBucketName(): string {
    return this.bucket;
  }

  private ensureConfigured() {
    if (!this.bucket) {
      throw new InternalServerErrorException('UPLOADS_S3_BUCKET is required for s3 storage');
    }
  }
}
