import {
  IsString,
  IsOptional,
  IsEnum,
  IsDateString,
  IsHexColor,
  IsArray,
  IsEmail,
  IsBoolean,
  IsObject,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ProjectStatus, ProjectVisibility, ProjectWorkflowType } from '@prisma/client';

class CreateProjectMemberDto {
  @ApiProperty({ example: 'usr_123' })
  @IsString()
  userId!: string;

  @ApiPropertyOptional({ example: 'MEMBER' })
  @IsString()
  @IsOptional()
  role?: string;
}

class CreateProjectInvitationDto {
  @ApiProperty({ example: 'maria@example.com' })
  @IsEmail()
  email!: string;

  @ApiPropertyOptional({ example: 'MEMBER' })
  @IsString()
  @IsOptional()
  role?: string;

  @ApiPropertyOptional({ example: 'Welcome to the project' })
  @IsString()
  @IsOptional()
  @MaxLength(500)
  message?: string;
}

class ProjectNotificationSettingsDto {
  @IsOptional()
  @IsBoolean()
  taskCreated?: boolean;

  @IsOptional()
  @IsBoolean()
  taskAssigned?: boolean;

  @IsOptional()
  @IsBoolean()
  taskCompleted?: boolean;

  @IsOptional()
  @IsBoolean()
  memberAdded?: boolean;

  @IsOptional()
  @IsBoolean()
  workflowUpdated?: boolean;

  @IsOptional()
  @IsBoolean()
  fileUploaded?: boolean;
}

export class CreateProjectDto {
  @ApiProperty({ example: 'GoPass Platform' })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name!: string;

  @ApiPropertyOptional({ example: 'Core SaaS platform development' })
  @IsString()
  @IsOptional()
  @MaxLength(3000)
  description?: string;

  @ApiPropertyOptional({ example: '#6366f1' })
  @IsHexColor()
  @IsOptional()
  color?: string;

  @ApiPropertyOptional({ example: 'rocket' })
  @IsString()
  @IsOptional()
  @MaxLength(32)
  icon?: string;

  @ApiPropertyOptional({ enum: ProjectVisibility })
  @IsEnum(ProjectVisibility)
  @IsOptional()
  visibility?: ProjectVisibility;

  @ApiPropertyOptional({ enum: ProjectWorkflowType })
  @IsEnum(ProjectWorkflowType)
  @IsOptional()
  workflowType?: ProjectWorkflowType;

  @ApiPropertyOptional({ type: [String], example: ['TODO', 'IN_PROGRESS', 'REVIEW', 'DONE'] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  workflowStates?: string[];

  @ApiPropertyOptional({ type: [String], example: ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  priorityLabels?: string[];

  @ApiPropertyOptional({ enum: ['OWNER', 'ADMIN', 'MEMBER', 'VIEWER'] })
  @IsString()
  @IsOptional()
  invitePermission?: string;

  @ApiPropertyOptional({ enum: ['OWNER', 'ADMIN', 'MEMBER', 'VIEWER'] })
  @IsString()
  @IsOptional()
  taskCreatePermission?: string;

  @ApiPropertyOptional({ type: ProjectNotificationSettingsDto })
  @IsObject()
  @IsOptional()
  notificationSettings?: ProjectNotificationSettingsDto;

  @ApiPropertyOptional({ enum: ProjectStatus })
  @IsEnum(ProjectStatus)
  @IsOptional()
  status?: ProjectStatus;

  @ApiPropertyOptional({ example: '2024-01-01' })
  @IsDateString()
  @IsOptional()
  startDate?: string;

  @ApiPropertyOptional({ example: '2024-12-31' })
  @IsDateString()
  @IsOptional()
  endDate?: string;

  @ApiPropertyOptional({ type: [CreateProjectMemberDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateProjectMemberDto)
  @IsOptional()
  members?: CreateProjectMemberDto[];

  @ApiPropertyOptional({ type: [CreateProjectInvitationDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateProjectInvitationDto)
  @IsOptional()
  invitations?: CreateProjectInvitationDto[];
}
