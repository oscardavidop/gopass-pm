import { IsOptional, IsEnum, IsString, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { ProjectStatus } from '@prisma/client';

export class FilterProjectsDto {
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  search?: string;

  @ApiPropertyOptional({ enum: ProjectStatus })
  @IsEnum(ProjectStatus)
  @IsOptional()
  status?: ProjectStatus;

  @ApiPropertyOptional({ default: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  page?: number = 1;

  @ApiPropertyOptional({ default: 20 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  @IsOptional()
  limit?: number = 20;

  @ApiPropertyOptional({ enum: ['name', 'createdAt', 'updatedAt', 'status'] })
  @IsString()
  @IsOptional()
  sortBy?: 'name' | 'createdAt' | 'updatedAt' | 'status' = 'createdAt';

  @ApiPropertyOptional({ enum: ['asc', 'desc'] })
  @IsString()
  @IsOptional()
  order?: 'asc' | 'desc' = 'desc';
}
