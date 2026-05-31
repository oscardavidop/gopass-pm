import { Transform } from 'class-transformer';
import { IsEnum, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';
import { FileEntityType } from '@prisma/client';

export class UploadFileDto {
  @Transform(({ value }) => String(value ?? '').toUpperCase())
  @IsEnum(FileEntityType)
  entityType: FileEntityType;

  @IsString()
  @IsUUID()
  entityId: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  kind?: string;
}
