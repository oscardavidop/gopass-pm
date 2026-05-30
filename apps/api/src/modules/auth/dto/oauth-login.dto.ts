import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class OAuthLoginDto {
    @ApiProperty({ example: 'oauth-authorization-code' })
    @IsString()
    @IsNotEmpty()
    code!: string;

    @ApiProperty({ example: 'http://localhost:3000/auth/oauth/callback' })
    @IsString()
    @IsNotEmpty()
    redirectUri!: string;

    @ApiProperty({ required: false, example: 'state-nonce' })
    @IsOptional()
    @IsString()
    state?: string;
}
