import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Query,
  Req,
  Res,
  UseGuards,
  HttpCode,
  HttpStatus,
  BadRequestException,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { Request, Response } from 'express';
import { ConfigService } from '@nestjs/config';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';

import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { OAuthLoginDto } from './dto/oauth-login.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { CurrentUser } from './decorators/current-user.decorator';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly config: ConfigService,
  ) {}

  @Post('register')
  @UseGuards(ThrottlerGuard)
  @ApiOperation({ summary: 'Register a new user' })
  async register(@Body() dto: RegisterDto, @Res({ passthrough: true }) res: Response) {
    const result = await this.authService.register(dto);
    this.setRefreshCookie(res, result.refreshToken);
    return { data: { user: result.user, accessToken: result.accessToken }, i18nKey: 'auth.registerSuccess' };
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @UseGuards(ThrottlerGuard)
  @ApiOperation({ summary: 'Login with email and password' })
  async login(@Body() dto: LoginDto, @Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const result = await this.authService.login(
      dto,
      req.headers['user-agent'],
      req.ip,
    );
    this.setRefreshCookie(res, result.refreshToken);
    return { data: { user: result.user, accessToken: result.accessToken }, i18nKey: 'auth.loginSuccess' };
  }

  @Post('oauth/:provider')
  @HttpCode(HttpStatus.OK)
  @UseGuards(ThrottlerGuard)
  @ApiOperation({ summary: 'Login or register with OAuth provider' })
  async oauth(
    @Param('provider') providerRaw: string,
    @Body() dto: OAuthLoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const provider = this.parseProvider(providerRaw);
    const result = await this.authService.oauthLogin(provider, dto, req.headers['user-agent'], req.ip);
    this.setRefreshCookie(res, result.refreshToken);
    return { data: { user: result.user, accessToken: result.accessToken }, i18nKey: 'auth.loginSuccess' };
  }

  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @UseGuards(ThrottlerGuard)
  @ApiOperation({ summary: 'Request a password reset link' })
  forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto);
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @UseGuards(ThrottlerGuard)
  @ApiOperation({ summary: 'Reset password with one-time token' })
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @UseGuards(ThrottlerGuard)
  @ApiOperation({ summary: 'Refresh access token using HTTP-only cookie' })
  async refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const token = req.cookies?.['refresh_token'];
    if (!token) {
      throw new UnauthorizedException({ i18nKey: 'auth.noRefreshToken' });
    }
    const result = await this.authService.refresh(token);
    this.setRefreshCookie(res, result.refreshToken);
    return { data: { accessToken: result.accessToken }, i18nKey: 'auth.loginSuccess' };
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Logout current session' })
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const token = req.cookies?.['refresh_token'];
    if (token) await this.authService.logout(token);
    this.clearRefreshCookie(res);
    return { data: { ok: true }, i18nKey: 'auth.logoutSuccess' };
  }

  @Post('logout-all')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Logout all sessions' })
  async logoutAll(@CurrentUser('id') userId: string, @Res({ passthrough: true }) res: Response) {
    await this.authService.logoutAll(userId);
    this.clearRefreshCookie(res);
    return { data: { ok: true }, i18nKey: 'auth.logoutAllSuccess' };
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Get current authenticated user' })
  me(@CurrentUser() user: any) {
    return user;
  }

  @Get('email-previews')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'List local email previews (SEND_REAL_EMAIL=false)' })
  listPreviews(@CurrentUser() user: any, @Query('limit') limit?: string) {
    if (user?.role !== 'ADMIN') throw new ForbiddenException('Insufficient permissions');
    return this.authService.listEmailPreviews(limit ? Number(limit) : undefined);
  }

  @Get('email-previews/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Get local email preview details' })
  getPreview(@CurrentUser() user: any, @Param('id') id: string) {
    if (user?.role !== 'ADMIN') throw new ForbiddenException('Insufficient permissions');
    return this.authService.getEmailPreview(id);
  }

  private parseProvider(providerRaw: string): string {
    const value = providerRaw.toUpperCase();
    if (['GOOGLE', 'GITHUB', 'MICROSOFT', 'DISCORD', 'LINKEDIN'].includes(value)) return value;
    throw new BadRequestException({ i18nKey: 'auth.oauthProviderUnsupported' });
  }

  private setRefreshCookie(res: Response, token: string) {
    const isProd = this.config.get<string>('NODE_ENV') === 'production';
    const sameSite = this.config.get<'strict' | 'lax' | 'none'>('COOKIE_SAME_SITE', isProd ? 'lax' : 'lax');
    const domain = this.config.get<string>('COOKIE_DOMAIN') || undefined;
    res.cookie('refresh_token', token, {
      httpOnly: true,
      secure: isProd,
      sameSite,
      domain,
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      path: '/',
    });
  }

  private clearRefreshCookie(res: Response) {
    const isProd = this.config.get<string>('NODE_ENV') === 'production';
    const sameSite = this.config.get<'strict' | 'lax' | 'none'>('COOKIE_SAME_SITE', isProd ? 'lax' : 'lax');
    const domain = this.config.get<string>('COOKIE_DOMAIN') || undefined;

    res.clearCookie('refresh_token', {
      httpOnly: true,
      secure: isProd,
      sameSite,
      domain,
      path: '/',
    });
  }
}
