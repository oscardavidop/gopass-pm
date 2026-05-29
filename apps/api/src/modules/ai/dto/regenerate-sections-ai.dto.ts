import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsEnum, IsOptional, IsString, IsUUID, MaxLength, MinLength } from 'class-validator';

enum RegenerateSection {
  LABELS = 'LABELS',
  SUBTASKS = 'SUBTASKS',
  ACCEPTANCE_CRITERIA = 'ACCEPTANCE_CRITERIA',
  EFFORT = 'EFFORT',
}

export class RegenerateSectionsAiDto {
  @ApiProperty({ example: 'project-uuid' })
  @IsUUID()
  projectId: string;

  @ApiProperty({ example: 'Implement payment processing' })
  @IsString()
  @MinLength(3)
  @MaxLength(200)
  title: string;

  @ApiPropertyOptional({ example: 'Use Stripe and secure webhooks' })
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  description?: string;

  @ApiProperty({ enum: RegenerateSection, isArray: true })
  @IsArray()
  @IsEnum(RegenerateSection, { each: true })
  sections: RegenerateSection[];

  @ApiPropertyOptional({ type: [String], example: ['backend', 'payments'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  currentLabels?: string[];
}
