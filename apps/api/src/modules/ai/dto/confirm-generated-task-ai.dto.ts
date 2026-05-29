import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Priority, TaskStatus } from '@prisma/client';
import {
  IsArray,
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

class SubtaskItemDto {
  @ApiProperty({ example: 'Implement webhook signature validation' })
  @IsString()
  @MinLength(3)
  @MaxLength(160)
  title: string;
}

export class ConfirmGeneratedTaskAiDto {
  @ApiProperty({ example: 'project-uuid' })
  @IsUUID()
  projectId: string;

  @ApiProperty({ example: 'Implement Payment Processing System' })
  @IsString()
  @MinLength(4)
  @MaxLength(200)
  title: string;

  @ApiProperty({ example: 'Build a secure and scalable payment processing system.' })
  @IsString()
  @MinLength(10)
  @MaxLength(5000)
  description: string;

  @ApiProperty({ enum: Priority, example: 'HIGH' })
  @IsEnum(Priority)
  priority: Priority;

  @ApiPropertyOptional({ enum: TaskStatus, default: 'TODO' })
  @IsOptional()
  @IsEnum(TaskStatus)
  status?: TaskStatus;

  @ApiPropertyOptional({ example: 16 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  estimatedHours?: number;

  @ApiPropertyOptional({ enum: ['LOW', 'MEDIUM', 'HIGH'], example: 'MEDIUM' })
  @IsOptional()
  @IsString()
  complexity?: 'LOW' | 'MEDIUM' | 'HIGH';

  @ApiPropertyOptional({ type: [String], example: ['backend', 'payments', 'stripe'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  labels?: string[];

  @ApiPropertyOptional({ type: [SubtaskItemDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SubtaskItemDto)
  subtasks?: SubtaskItemDto[];

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  acceptanceCriteria?: string[];

  @ApiPropertyOptional({ example: '2026-06-10' })
  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @ApiPropertyOptional({ example: 'member-uuid' })
  @IsOptional()
  @IsUUID()
  assigneeId?: string;
}
