import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { UploadsController } from './uploads.controller';
import { UploadsService } from './uploads.service';
import { LocalStorageProvider } from './storage/local-storage.provider';
import { STORAGE_PROVIDER } from './storage/storage.provider';
import { S3StorageProvider } from './storage/s3-storage.provider';

@Module({
  controllers: [UploadsController],
  providers: [
    UploadsService,
    LocalStorageProvider,
    S3StorageProvider,
    {
      provide: STORAGE_PROVIDER,
      inject: [ConfigService, LocalStorageProvider, S3StorageProvider],
      useFactory: (config: ConfigService, local: LocalStorageProvider, s3: S3StorageProvider) => {
        const provider = config.get<string>('UPLOADS_PROVIDER', 's3').toLowerCase();
        return provider === 'local' ? local : s3;
      },
    },
  ],
  exports: [UploadsService],
})
export class UploadsModule {}
