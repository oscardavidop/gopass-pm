import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsUUID, MaxLength, MinLength } from 'class-validator';

export class TaskSuggestionsAiDto {
  @ApiProperty({ example: 'project-uuid' })
  @IsUUID()
  projectId: string;

  @ApiProperty({ example: 'auth' })
  @IsString()
  @MinLength(2)
  @MaxLength(240)
  seed: string;
}
