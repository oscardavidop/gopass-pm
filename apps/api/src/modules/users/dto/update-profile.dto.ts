import { IsString, IsOptional, MaxLength, Matches } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateProfileDto {
  @ApiPropertyOptional({ example: 'John' })
  @IsString()
  @IsOptional()
  @MaxLength(50)
  firstName?: string;

  @ApiPropertyOptional({ example: 'Doe' })
  @IsString()
  @IsOptional()
  @MaxLength(50)
  lastName?: string;

  @ApiPropertyOptional({ example: 'Frontend developer @acme' })
  @IsString()
  @IsOptional()
  @MaxLength(200)
  bio?: string;

  @ApiPropertyOptional({ example: '/api/v1/files/uuid?exp=123&sig=abc' })
  @IsString()
  @IsOptional()
  @MaxLength(2048)
  @Matches(/^(https?:\/\/.+|\/.+|file:[a-zA-Z0-9-]+)$/i, {
    message: 'avatar must be an absolute URL, a relative URL, or a file reference',
  })
  avatar?: string;
}
