import { IsString, IsOptional, MaxLength, IsUrl } from 'class-validator';
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

  @ApiPropertyOptional({ example: 'https://cdn.example.com/avatar.jpg' })
  @IsUrl()
  @IsOptional()
  avatar?: string;
}
