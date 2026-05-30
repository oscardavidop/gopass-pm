import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { ProjectRole } from '@prisma/client';

export class UpdateMemberRoleDto {
  @ApiProperty({ enum: ProjectRole })
  @IsEnum(ProjectRole)
  role: ProjectRole;
}
