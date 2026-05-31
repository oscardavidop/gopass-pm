import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Role } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { createHash, randomBytes } from 'crypto';

import { PrismaService } from '../../shared/database/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { OAuthLoginDto } from './dto/oauth-login.dto';
import { EmailService } from '../mail/email.service';

type OAuthProviderInput = 'GOOGLE' | 'GITHUB' | 'MICROSOFT' | 'DISCORD' | 'LINKEDIN';

const COLLABORATION_PALETTE = [
  '#3b82f6',
  '#10b981',
  '#f59e0b',
  '#8b5cf6',
  '#ef4444',
  '#06b6d4',
  '#84cc16',
  '#ec4899',
];


interface OAuthAccountModel {
  findUnique: (args: any) => Promise<any>;
  upsert: (args: any) => Promise<any>;
  create: (args: any) => Promise<any>;
}

interface PasswordResetTokenModel {
  deleteMany: (args: any) => Promise<any>;
  create: (args: any) => Promise<any>;
  findUnique: (args: any) => Promise<any>;
  update: (args: any) => Promise<any>;
}

interface EmailVerificationTokenModel {
  deleteMany: (args: any) => Promise<any>;
  create: (args: any) => Promise<any>;
  findUnique: (args: any) => Promise<any>;
  update: (args: any) => Promise<any>;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly email: EmailService,
  ) {}

  private get oauthAccountModel(): OAuthAccountModel {
    return (this.prisma as any)['oAuthAccount'] as OAuthAccountModel;
  }

  private get passwordResetTokenModel(): PasswordResetTokenModel {
    return (this.prisma as any)['passwordResetToken'] as PasswordResetTokenModel;
  }

  private get emailVerificationTokenModel(): EmailVerificationTokenModel {
    return (this.prisma as any)['emailVerificationToken'] as EmailVerificationTokenModel;
  }


  async register(dto: RegisterDto) {
    const exists = await this.prisma.user.findFirst({
      where: { OR: [{ email: dto.email }, { username: dto.username }] },
    });

    if (exists) {
      if (exists.email === dto.email) throw new ConflictException('Email already registered');
      throw new ConflictException('Username already taken');
    }

    const hashedPassword = await bcrypt.hash(dto.password, 12);

    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        username: dto.username,
        password: hashedPassword,
        firstName: dto.firstName,
        lastName: dto.lastName,
        collaborationColor: this.pickCollaborationColor(dto.email),
        emailVerified: false,
      },
      select: {
        id: true,
        email: true,
        username: true,
        firstName: true,
        lastName: true,
        collaborationColor: true,
        emailVerified: true,
        role: true,
        avatar: true,
        createdAt: true,
      },
    });

    await this.sendEmailVerification(user.id, user.email, user.firstName);
    await this.logAuthActivity(user.id, 'EMAIL_VERIFICATION_SENT', {
      source: 'register',
    });

    return {
      user,
      requiresEmailVerification: true,
      verificationSent: true,
    };
  }

  async login(dto: LoginDto, userAgent?: string, ipAddress?: string) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (!user || !user.isActive || user.deletedAt) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!user.emailVerified) {
      await this.logAuthActivity(user.id, 'LOGIN_BLOCKED_UNVERIFIED', {
        reason: 'email_not_verified',
      });
      throw new ForbiddenException({
        i18nKey: 'auth.emailNotVerified',
        i18nParams: { email: user.email },
      });
    }

    const isValid = await bcrypt.compare(dto.password, user.password);
    if (!isValid) {
      await this.logAuthActivity(user.id, 'LOGIN_FAILED', { reason: 'invalid_password' });
      throw new UnauthorizedException('Invalid credentials');
    }

    const tokens = await this.generateTokens(user.id, user.email, user.role);

    await this.saveRefreshToken(tokens.refreshToken, user.id, userAgent, ipAddress);
    await this.logAuthActivity(user.id, 'LOGIN_SUCCESS', {
      userAgent,
      ipAddress,
    });

    const { password: _, ...safeUser } = user;
    return { user: safeUser, ...tokens };
  }

  async refresh(token: string) {
    let payload: { sub: string; email: string; role: string };

    try {
      payload = this.jwt.verify(token, {
        secret: this.config.getOrThrow('JWT_REFRESH_SECRET'),
      });
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    const tokenHash = this.hashToken(token);
    const stored = await this.prisma.refreshToken.findUnique({
      where: { token: tokenHash },
      include: { user: true },
    });

    if (!stored || stored.expiresAt < new Date() || !stored.user.isActive) {
      throw new UnauthorizedException('Refresh token revoked or expired');
    }

    // Rotate refresh token
    await this.prisma.refreshToken.delete({ where: { token: tokenHash } });

    const newTokens = await this.generateTokens(payload.sub, payload.email, payload.role);
    await this.saveRefreshToken(newTokens.refreshToken, payload.sub);

    return newTokens;
  }

  async logout(token: string) {
    await this.prisma.refreshToken.deleteMany({ where: { token: this.hashToken(token) } });
  }

  async logoutAll(userId: string) {
    await this.prisma.refreshToken.deleteMany({ where: { userId } });
  }

  async oauthLogin(provider: string, dto: OAuthLoginDto, userAgent?: string, ipAddress?: string) {
    const normalized = provider.toUpperCase() as OAuthProviderInput;

    if (normalized !== 'GOOGLE' && normalized !== 'GITHUB') {
      throw new BadRequestException('OAuth provider not enabled yet');
    }

    this.assertAllowedOAuthRedirect(dto.redirectUri);

    const profile = normalized === 'GOOGLE'
      ? await this.fetchGoogleProfile(dto.code, dto.redirectUri)
      : await this.fetchGithubProfile(dto.code, dto.redirectUri);

    if (!profile.email) {
      throw new UnauthorizedException('OAuth provider did not return a verified email');
    }

    const existingAccount = await this.oauthAccountModel.findUnique({
      where: {
        provider_providerAccountId: {
          provider: normalized,
          providerAccountId: profile.providerAccountId,
        },
      },
      include: { user: true },
    });

    let user = existingAccount?.user;

    if (!user) {
      const byEmail = await this.prisma.user.findUnique({ where: { email: profile.email } });
      if (byEmail) {
        user = byEmail;
        await this.oauthAccountModel.upsert({
          where: {
            provider_providerAccountId: {
              provider: normalized,
              providerAccountId: profile.providerAccountId,
            },
          },
          update: {
            accessToken: profile.accessToken,
            refreshToken: profile.refreshToken,
            expiresAt: profile.expiresAt,
          },
          create: {
            provider: normalized,
            providerAccountId: profile.providerAccountId,
            accessToken: profile.accessToken,
            refreshToken: profile.refreshToken,
            expiresAt: profile.expiresAt,
            userId: byEmail.id,
          },
        });
      } else {
        const generatedUsername = await this.generateUniqueUsername(profile.email, profile.firstName, profile.lastName);
        const randomPassword = await bcrypt.hash(randomBytes(24).toString('hex'), 12);

        user = await this.prisma.user.create({
          data: {
            email: profile.email,
            username: generatedUsername,
            password: randomPassword,
            firstName: profile.firstName || 'User',
            lastName: profile.lastName || normalized.toLowerCase(),
            collaborationColor: this.pickCollaborationColor(profile.email),
            emailVerified: true,
            emailVerifiedAt: new Date(),
            role: Role.USER,
          },
        });

        await this.oauthAccountModel.create({
          data: {
            provider: normalized,
            providerAccountId: profile.providerAccountId,
            accessToken: profile.accessToken,
            refreshToken: profile.refreshToken,
            expiresAt: profile.expiresAt,
            userId: user.id,
          },
        });
      }
    }

    if (!user || !user.isActive || user.deletedAt) {
      throw new UnauthorizedException('User not available');
    }

    const tokens = await this.generateTokens(user.id, user.email, user.role);
    await this.saveRefreshToken(tokens.refreshToken, user.id, userAgent, ipAddress);

    const { password: _, ...safeUser } = user;
    return { user: safeUser, ...tokens };
  }

  async forgotPassword(dto: ForgotPasswordDto) {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });

    // Prevent account enumeration: always respond success even if user does not exist.
    if (!user || !user.isActive || user.deletedAt) {
      return { message: 'If your email exists, you will receive reset instructions shortly.' };
    }

    await this.passwordResetTokenModel.deleteMany({ where: { userId: user.id, usedAt: null } });

    const rawToken = randomBytes(32).toString('hex');
    const tokenHash = this.hashToken(rawToken);
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000);

    await this.passwordResetTokenModel.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt,
      },
    });

    const frontendUrl = this.config.get<string>('FRONTEND_URL', 'http://localhost:3000');
    const resetUrl = `${frontendUrl}/reset-password?token=${rawToken}`;

    await this.email.sendResetPasswordEmail({
      to: user.email,
      userId: user.id,
      userName: user.firstName,
      resetUrl,
      expirationTime: '30 minutes',
      companyName: this.config.get<string>('COMPANY_NAME', 'Tasku'),
      supportEmail: this.config.get<string>('SUPPORT_EMAIL', 'support@tasku.pro'),
      companyAddress: this.config.get<string>('COMPANY_ADDRESS', '123 Main St, Anytown'),
      year: new Date().getFullYear().toString(),
    });

    await this.logAuthActivity(user.id, 'PASSWORD_RESET_REQUESTED', {
      source: 'forgot_password',
    });

    return { message: 'If your email exists, you will receive reset instructions shortly.' };
  }

  async validateResetPasswordToken(rawToken: string) {
    const tokenHash = this.hashToken(rawToken);
    const record = await this.passwordResetTokenModel.findUnique({
      where: { tokenHash },
      include: { user: true },
    });

    if (!record || !record.user || !record.user.isActive || record.user.deletedAt) {
      return { valid: false, reason: 'invalid' as const };
    }
    if (record.usedAt) {
      return { valid: false, reason: 'used' as const };
    }
    if (record.expiresAt < new Date()) {
      return { valid: false, reason: 'expired' as const };
    }

    return { valid: true, reason: 'ok' as const };
  }

  async resetPassword(dto: ResetPasswordDto) {
    const tokenHash = this.hashToken(dto.token);
    const validation = await this.validateResetPasswordToken(dto.token);
    if (!validation.valid) {
      throw new BadRequestException({
        i18nKey: 'auth.invalidResetToken',
      });
    }

    const record = await this.passwordResetTokenModel.findUnique({ where: { tokenHash }, include: { user: true } });
    if (!record) {
      throw new BadRequestException({ i18nKey: 'auth.invalidResetToken' });
    }

    const newPasswordHash = await bcrypt.hash(dto.newPassword, 12);

    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: record.userId },
        data: { password: newPasswordHash },
      });

      await (tx as typeof tx & { passwordResetToken: PasswordResetTokenModel }).passwordResetToken.update({
        where: { id: record.id },
        data: { usedAt: new Date() },
      });

      await tx.refreshToken.deleteMany({ where: { userId: record.userId } });
    });

    await this.logAuthActivity(record.userId, 'PASSWORD_RESET_USED', {
      source: 'reset_password',
    });

    return { message: 'Password reset successful. Please login again.' };
  }

  async resendVerificationEmail(email: string) {
    const normalized = email.trim().toLowerCase();
    const user = await this.prisma.user.findUnique({ where: { email: normalized } });

    if (!user || !user.isActive || user.deletedAt || user.emailVerified) {
      return { sent: true };
    }

    await this.sendEmailVerification(user.id, user.email, user.firstName);
    await this.logAuthActivity(user.id, 'EMAIL_VERIFICATION_SENT', { source: 'resend' });
    return { sent: true };
  }

  async verifyEmail(rawToken: string) {
    const tokenHash = this.hashToken(rawToken);
    const record = await this.emailVerificationTokenModel.findUnique({
      where: { tokenHash },
      include: { user: true },
    });

    if (!record || !record.user || !record.user.isActive || record.user.deletedAt) {
      throw new BadRequestException({ i18nKey: 'auth.invalidVerificationToken' });
    }

    if (record.usedAt || record.expiresAt < new Date()) {
      throw new BadRequestException({ i18nKey: 'auth.invalidVerificationToken' });
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: record.userId },
        data: {
          emailVerified: true,
          emailVerifiedAt: new Date(),
        },
      });

      await (tx as typeof tx & { emailVerificationToken: EmailVerificationTokenModel }).emailVerificationToken.update({
        where: { id: record.id },
        data: { usedAt: new Date() },
      });

      await (tx as typeof tx & { emailVerificationToken: EmailVerificationTokenModel }).emailVerificationToken.deleteMany({
        where: { userId: record.userId, usedAt: null },
      });
    });

    const appUrl = this.config.get<string>('APP_URL', 'http://localhost:3000');
    await this.email.sendWelcomeEmail({
      to: record.user.email,
      userId: record.user.id,
      userName: record.user.firstName,
      appUrl,
      supportEmail: this.config.get<string>('SUPPORT_EMAIL', 'support@tasku.pro'),
      year: new Date().getFullYear().toString(),
      companyName: this.config.get<string>('COMPANY_NAME', 'Tasku'),
      companyAddress: this.config.get<string>('COMPANY_ADDRESS', '123 Main St, Anytown'),
    });

    await this.logAuthActivity(record.user.id, 'EMAIL_VERIFICATION_COMPLETED', {
      source: 'verify_email',
    });

    return { verified: true };
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.isActive || user.deletedAt) {
      throw new UnauthorizedException({ i18nKey: 'auth.userNotFoundOrInactive' });
    }

    const isValid = await bcrypt.compare(currentPassword, user.password);
    if (!isValid) {
      throw new UnauthorizedException({ i18nKey: 'auth.invalidCredentials' });
    }

    const nextHash = await bcrypt.hash(newPassword, 12);
    await this.prisma.user.update({ where: { id: userId }, data: { password: nextHash } });
    await this.logAuthActivity(userId, 'PASSWORD_CHANGED', { source: 'settings_security' });
    return { changed: true };
  }

  async listActiveSessions(userId: string) {
    return this.prisma.refreshToken.findMany({
      where: { userId, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        userAgent: true,
        ipAddress: true,
        createdAt: true,
        expiresAt: true,
      },
      take: 20,
    });
  }

  async listEmailPreviews(limit = 25) {
    const sendRealEmail = String(this.config.get('SEND_REAL_EMAIL', 'false')).toLowerCase() === 'true';
    if (sendRealEmail) {
      throw new BadRequestException('Email previews are disabled when SEND_REAL_EMAIL=true');
    }
    return this.email.listPreviews(limit);
  }

  async getEmailPreview(id: string) {
    const sendRealEmail = String(this.config.get('SEND_REAL_EMAIL', 'false')).toLowerCase() === 'true';
    if (sendRealEmail) {
      throw new BadRequestException('Email previews are disabled when SEND_REAL_EMAIL=true');
    }
    const preview = await this.email.getPreview(id);
    if (!preview) throw new BadRequestException('Preview not found');
    return preview;
  }

  private async sendEmailVerification(userId: string, email: string, firstName?: string | null) {
    await this.emailVerificationTokenModel.deleteMany({ where: { userId, usedAt: null } });

    const rawToken = randomBytes(32).toString('hex');
    const tokenHash = this.hashToken(rawToken);
    const ttlMinutes = Number(this.config.get<string>('EMAIL_VERIFICATION_TTL_MINUTES', '60'));
    const expiresAt = new Date(Date.now() + Math.max(15, Math.min(60, ttlMinutes)) * 60 * 1000);

    await this.emailVerificationTokenModel.create({
      data: {
        userId,
        tokenHash,
        expiresAt,
      },
    });

    const frontendUrl = this.config.get<string>('FRONTEND_URL', 'http://localhost:3000');
    const verificationUrl = `${frontendUrl}/verify-email?token=${rawToken}`;

    await this.email.sendEmailVerificationEmail({
      to: email,
      userId,
      userName: firstName || 'there',
      verificationUrl,
      expirationTime: `${Math.max(15, Math.min(60, ttlMinutes))} minutes`,
      companyName: this.config.get<string>('COMPANY_NAME', 'Tasku'),
      supportEmail: this.config.get<string>('SUPPORT_EMAIL', 'support@tasku.pro'),
      companyAddress: this.config.get<string>('COMPANY_ADDRESS', '123 Main St, Anytown'),
      year: new Date().getFullYear().toString(),
    });
  }

  private async logAuthActivity(userId: string, action: string, payload?: Record<string, unknown>) {
    try {
      await this.prisma.activityLog.create({
        data: {
          action,
          entity: 'Auth',
          entityId: userId,
          userId,
          newValue: payload as any,
        },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(`Auth activity log failed for ${action}: ${message}`);
    }
  }

  private async generateTokens(userId: string, email: string, role: string) {
    const payload = { sub: userId, email, role };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwt.signAsync(payload, {
        secret: this.config.getOrThrow('JWT_ACCESS_SECRET'),
        expiresIn: this.config.get('JWT_ACCESS_EXPIRES_IN', '15m'),
      }),
      this.jwt.signAsync(payload, {
        secret: this.config.getOrThrow('JWT_REFRESH_SECRET'),
        expiresIn: this.config.get('JWT_REFRESH_EXPIRES_IN', '7d'),
      }),
    ]);

    return { accessToken, refreshToken };
  }

  private hashToken(rawToken: string) {
    return createHash('sha256').update(rawToken).digest('hex');
  }

  private async saveRefreshToken(rawToken: string, userId: string, userAgent?: string, ipAddress?: string) {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await this.prisma.refreshToken.create({
      data: {
        token: this.hashToken(rawToken),
        userId,
        userAgent,
        ipAddress,
        expiresAt,
      },
    });
  }

  private async generateUniqueUsername(email: string, firstName?: string, lastName?: string) {
    const baseRaw = [firstName, lastName].filter(Boolean).join('_') || email.split('@')[0] || 'user';
    const base = baseRaw.toLowerCase().replace(/[^a-z0-9_]/g, '_').replace(/_+/g, '_').slice(0, 20) || 'user';

    for (let i = 0; i < 25; i++) {
      const candidate = i === 0 ? base : `${base}_${i}`.slice(0, 30);
      const exists = await this.prisma.user.findUnique({ where: { username: candidate } });
      if (!exists) return candidate;
    }

    return `${base}_${randomBytes(4).toString('hex')}`.slice(0, 30);
  }

  private async fetchGoogleProfile(code: string, redirectUri: string) {
    const clientId = this.config.get<string>('GOOGLE_CLIENT_ID');
    const clientSecret = this.config.get<string>('GOOGLE_CLIENT_SECRET');
    if (!clientId || !clientSecret) throw new BadRequestException('Google OAuth is not configured');

    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });

    if (!tokenRes.ok) throw new UnauthorizedException('Google OAuth token exchange failed');
    const tokenJson: any = await tokenRes.json();

    const userRes = await fetch('https://openidconnect.googleapis.com/v1/userinfo', {
      headers: { Authorization: `Bearer ${tokenJson.access_token}` },
    });

    if (!userRes.ok) throw new UnauthorizedException('Google OAuth profile fetch failed');
    const userJson: any = await userRes.json();

    return {
      providerAccountId: String(userJson.sub),
      email: String(userJson.email || ''),
      firstName: userJson.given_name ? String(userJson.given_name) : undefined,
      lastName: userJson.family_name ? String(userJson.family_name) : undefined,
      accessToken: tokenJson.access_token ? String(tokenJson.access_token) : undefined,
      refreshToken: tokenJson.refresh_token ? String(tokenJson.refresh_token) : undefined,
      expiresAt: tokenJson.expires_in ? new Date(Date.now() + Number(tokenJson.expires_in) * 1000) : undefined,
    };
  }

  private async fetchGithubProfile(code: string, redirectUri: string) {
    const clientId = this.config.get<string>('GITHUB_CLIENT_ID');
    const clientSecret = this.config.get<string>('GITHUB_CLIENT_SECRET');
    if (!clientId || !clientSecret) throw new BadRequestException('GitHub OAuth is not configured');

    const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        code,
        redirect_uri: redirectUri,
      }),
    });

    if (!tokenRes.ok) throw new UnauthorizedException('GitHub OAuth token exchange failed');
    const tokenJson: any = await tokenRes.json();

    const profileRes = await fetch('https://api.github.com/user', {
      headers: {
        Authorization: `Bearer ${tokenJson.access_token}`,
        Accept: 'application/vnd.github+json',
        'User-Agent': 'tasku-app',
      },
    });

    if (!profileRes.ok) throw new UnauthorizedException('GitHub OAuth profile fetch failed');
    const profileJson: any = await profileRes.json();

    const emailRes = await fetch('https://api.github.com/user/emails', {
      headers: {
        Authorization: `Bearer ${tokenJson.access_token}`,
        Accept: 'application/vnd.github+json',
        'User-Agent': 'tasku-app',
      },
    });
    const emails: any[] = emailRes.ok ? await emailRes.json() : [];
    const primaryEmail = emails.find((e) => e.primary && e.verified)?.email
      || emails.find((e) => e.verified)?.email
      || profileJson.email;

    const [firstName, ...rest] = String(profileJson.name || '').split(' ').filter(Boolean);
    return {
      providerAccountId: String(profileJson.id),
      email: String(primaryEmail || ''),
      firstName: firstName || undefined,
      lastName: rest.join(' ') || undefined,
      accessToken: tokenJson.access_token ? String(tokenJson.access_token) : undefined,
      refreshToken: tokenJson.refresh_token ? String(tokenJson.refresh_token) : undefined,
      expiresAt: tokenJson.expires_in ? new Date(Date.now() + Number(tokenJson.expires_in) * 1000) : undefined,
    };
  }

  private pickCollaborationColor(seed: string) {
    let hash = 0;
    for (let i = 0; i < seed.length; i++) {
      hash = (hash << 5) - hash + seed.charCodeAt(i);
      hash |= 0;
    }
    return COLLABORATION_PALETTE[Math.abs(hash) % COLLABORATION_PALETTE.length];
  }

  private assertAllowedOAuthRedirect(redirectUri: string) {
    let redirect: URL;
    try {
      redirect = new URL(redirectUri);
    } catch {
      throw new BadRequestException('Invalid OAuth redirectUri');
    }

    const allowlistRaw = this.config.get<string>('OAUTH_REDIRECT_ALLOWLIST', '');
    const normalizedAllowlist = allowlistRaw
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean)
      .map((value) => {
        try {
          const parsed = new URL(value);
          return `${parsed.origin}${parsed.pathname}`;
        } catch {
          return value;
        }
      });

    if (normalizedAllowlist.length === 0) {
      const frontend = this.config.get<string>('FRONTEND_URL');
      if (frontend) {
        const parsed = new URL(frontend);
        normalizedAllowlist.push(`${parsed.origin}/auth/oauth/callback`);
      }
    }

    const normalizedRedirect = `${redirect.origin}${redirect.pathname}`;

    if (!normalizedAllowlist.includes(normalizedRedirect)) {
      throw new BadRequestException('OAuth redirectUri is not allowed');
    }
  }
}
