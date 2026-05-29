import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsUUID, MaxLength, MinLength, IsOptional } from 'class-validator';

export class ImproveDescriptionAiDto {
  @ApiProperty({ example: 'project-uuid' })
  @IsUUID()
  projectId: string;

  @ApiPropertyOptional({ example: 'Implement login flow' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  title?: string;

  @ApiProperty({ example: 'hacer login' })
  @IsString()
  @MinLength(3)
  @MaxLength(5000)
  description: string;
}
