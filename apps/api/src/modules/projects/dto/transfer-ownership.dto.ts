import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsUUID } from 'class-validator';

export class TransferOwnershipDto {
  @ApiProperty({ example: 'user-uuid' })
  @IsString()
  @IsUUID()
  userId!: string;
}
