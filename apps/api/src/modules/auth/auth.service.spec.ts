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

  const config = { get: jest.fn(() => 'http://localhost:3000') } as any;
    // @ts-ignore

  const email = { send: jest.fn() } as any;

  let service: AuthService;
    // @ts-ignore

  beforeEach(() => {
    // @ts-ignore

    jest.clearAllMocks();
    service = new AuthService(prisma, jwt, config, email);
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
});
