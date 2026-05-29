import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsUUID, MaxLength, MinLength, IsOptional } from 'class-validator';

export class GenerateSubtasksAiDto {
  @ApiProperty({ example: 'project-uuid' })
  @IsUUID()
  projectId: string;

  @ApiProperty({ example: 'Build Stripe payment webhooks' })
  @IsString()
  @MinLength(3)
  @MaxLength(200)
  title: string;

  @ApiPropertyOptional({ example: 'Handle retries, signatures and event mapping' })
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  description?: string;
}
