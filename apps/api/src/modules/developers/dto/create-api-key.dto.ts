import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsDateString, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateApiKeyDto {
  @ApiProperty({ example: 'CI Pipeline Key' })
  @IsString()
  @MinLength(3)
  @MaxLength(80)
  name!: string;

  @ApiProperty({
    required: false,
    type: [String],
    example: ['projects:read', 'tasks:write'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  scopes?: string[];

  @ApiProperty({ required: false, example: '2026-12-31T23:59:59.000Z' })
  @IsOptional()
  @IsDateString()
  expiresAt?: string;
}
