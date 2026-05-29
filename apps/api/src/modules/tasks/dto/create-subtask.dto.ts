import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, MaxLength, Min, MinLength } from 'class-validator';

export class CreateSubtaskDto {
  @ApiProperty({ example: 'Implement webhook handler' })
  @IsString()
  @MinLength(2)
  @MaxLength(160)
  title: string;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  completed?: boolean;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  position?: number;
}
