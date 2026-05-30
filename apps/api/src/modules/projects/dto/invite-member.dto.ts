import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { ProjectRole } from '@prisma/client';

export class InviteMemberDto {
  @ApiProperty({ example: 'maria@example.com' })
  @IsEmail()
  email: string;

  @ApiPropertyOptional({ enum: ProjectRole, default: ProjectRole.MEMBER })
  @IsEnum(ProjectRole)
  @IsOptional()
  role?: ProjectRole;

  @ApiPropertyOptional({ example: 'Welcome to Product Redesign project' })
  @IsString()
  @IsOptional()
  @MaxLength(500)
  message?: string;
}
