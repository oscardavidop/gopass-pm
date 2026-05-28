import { IsEmail, IsString, IsNotEmpty, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({ example: 'admin@gopass.dev' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'Admin123!' })
  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  password: string;
}
