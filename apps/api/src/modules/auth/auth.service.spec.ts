import { AuthService } from './auth.service';

describe('AuthService', () => {
  const prisma = {
    user: { findUnique: jest.fn() },
    passwordResetToken: { deleteMany: jest.fn() },
  } as any;

  const jwt = {} as any;
  const config = { get: jest.fn(() => 'http://localhost:3000') } as any;
  const email = { send: jest.fn() } as any;

  let service: AuthService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new AuthService(prisma, jwt, config, email);
  });

  it('returns generic message when user does not exist in forgot password', async () => {
    prisma.user.findUnique.mockResolvedValue(null);

    const result = await service.forgotPassword({ email: 'missing@example.com' });

    expect(result.message).toContain('If your email exists');
    expect(email.send).not.toHaveBeenCalled();
  });
});
