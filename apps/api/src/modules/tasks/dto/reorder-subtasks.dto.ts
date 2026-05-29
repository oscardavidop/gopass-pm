import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsUUID } from 'class-validator';

export class ReorderSubtasksDto {
  @ApiProperty({ type: [String], example: ['subtask-id-1', 'subtask-id-2'] })
  @IsArray()
  @IsUUID('4', { each: true })
  orderedIds: string[];
}
