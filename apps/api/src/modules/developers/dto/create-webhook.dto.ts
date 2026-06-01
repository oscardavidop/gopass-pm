import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsOptional, IsString, IsUrl, MaxLength, MinLength } from 'class-validator';

export class CreateWebhookDto {
  @ApiProperty({ example: 'Primary task events' })
  @IsString()
  @MinLength(3)
  @MaxLength(120)
  name!: string;

  @ApiProperty({ example: 'https://example.com/webhooks/tasku' })
  @IsUrl({ require_protocol: true })
  url!: string;

  @ApiProperty({
    required: false,
    type: [String],
    example: ['task.created', 'task.updated', 'task.completed'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  events?: string[];
}
