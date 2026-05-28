import {
  IsString,
  IsOptional,
  IsEnum,
  IsDateString,
  IsArray,
  IsUUID,
  MaxLength,
  MinLength,
  IsInt,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Priority, TaskStatus } from '@prisma/client';

export class CreateTaskDto {
  @ApiProperty({ example: 'Implement JWT authentication' })
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  title: string;

  @ApiPropertyOptional({ example: 'Access + Refresh token strategy' })
  @IsString()
  @IsOptional()
  @MaxLength(2000)
  description?: string;

  @ApiPropertyOptional({ enum: Priority, default: 'MEDIUM' })
  @IsEnum(Priority)
  @IsOptional()
  priority?: Priority = Priority.MEDIUM;

  @ApiPropertyOptional({ enum: TaskStatus, default: 'TODO' })
  @IsEnum(TaskStatus)
  @IsOptional()
  status?: TaskStatus = TaskStatus.TODO;

  @ApiPropertyOptional({ example: '2024-12-31' })
  @IsDateString()
  @IsOptional()
  dueDate?: string;

  @ApiPropertyOptional({ example: 'user-uuid' })
  @IsUUID()
  @IsOptional()
  assigneeId?: string;

  @ApiPropertyOptional({ example: ['auth', 'security'] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  tags?: string[] = [];

  @ApiPropertyOptional({ default: 0 })
  @IsInt()
  @Min(0)
  @IsOptional()
  position?: number = 0;
}
