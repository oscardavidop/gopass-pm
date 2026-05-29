import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, MaxLength, MinLength, IsOptional, IsUUID } from 'class-validator';

export class GenerateTaskAiDto {
  @ApiProperty({ example: 'Implement payment system with webhooks' })
  @IsString()
  @MinLength(3)
  @MaxLength(400)
  userIdea: string;

  @ApiPropertyOptional({ example: 'Payment processing' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  titleHint?: string;

  @ApiPropertyOptional({ example: 'Need retries and secure webhook validation' })
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  descriptionHint?: string;

  @ApiProperty({ example: 'project-uuid' })
  @IsUUID()
  projectId: string;
}
