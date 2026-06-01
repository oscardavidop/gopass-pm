import { BadRequestException } from '@nestjs/common';

import { AuthService } from './auth.service';
//@ts-ignore - no need to mock entire PrismaService, just the parts used by AuthService
//
describe('AuthService', () => {
  const prisma = {
    // @ts-ignore
    user: { findUnique: jest.fn() },
    // @ts-ignore
    passwordResetToken: { deleteMany: jest.fn() },
  } as any;

  const jwt = {} as any;
    // @ts-ignore

  const config = {
    get: jest.fn((key: string) => {
      if (key === 'OAUTH_REDIRECT_ALLOWLIST') return 'http://localhost:3000/auth/oauth/callback';
      return 'http://localhost:3000';
    }),
  } as any;
    // @ts-ignore

  const email = { send: jest.fn() } as any;
  const cacheManager = { remember: jest.fn() } as any;
  const cacheService = { set: jest.fn(), delByPattern: jest.fn() } as any;
  const cacheInvalidation = { invalidateSession: jest.fn(), invalidateUser: jest.fn() } as any;

  let service: AuthService;
    // @ts-ignore

  beforeEach(() => {
    // @ts-ignore

    jest.clearAllMocks();
    service = new AuthService(prisma, jwt, config, email, cacheManager, cacheService, cacheInvalidation);
  });
    // @ts-ignore

  it('returns generic message when user does not exist in forgot password', async () => {
    prisma.user.findUnique.mockResolvedValue(null);
    const result = await service.forgotPassword({ email: 'missing@example.com' });
    // @ts-ignore
    expect(result.message).toContain('If your email exists');
    // @ts-ignore
    expect(email.send).not.toHaveBeenCalled();
  });

  it('rejects oauth login when redirect uri is outside allowlist', async () => {
    await expect(
      service.oauthLogin('GOOGLE', {
        code: 'any-code',
        redirectUri: 'https://evil.example.com/callback',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
