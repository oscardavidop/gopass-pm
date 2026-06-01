export type Role = 'ADMIN' | 'MANAGER' | 'USER';

export interface User {
  id: string;
  email: string;
  username: string;
  firstName: string;
  lastName: string;
  avatar: string | null;
  collaborationColor?: string | null;
  emailVerified?: boolean;
  emailVerifiedAt?: string | null;
  bio: string | null;
  role: Role;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AuthTokens {
  accessToken: string;
}

export interface AuthResponse {
  user: User;
  accessToken: string;
  sessionId: string;
}

export interface RegisterResponse {
  user: User;
  requiresEmailVerification: boolean;
  verificationSent: boolean;
}
