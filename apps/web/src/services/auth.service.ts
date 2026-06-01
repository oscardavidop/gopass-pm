import { api } from './api';
import type { AuthResponse, RegisterResponse } from '@/types/auth.types';

export type OAuthProvider = 'google' | 'github' | 'microsoft' | 'discord' | 'linkedin';

export const authService = {
  register: (data: { email: string; username: string; password: string; firstName: string; lastName: string }) =>
    api.post<{ data: RegisterResponse }>('/auth/register', data).then((r) => r.data.data),

  login: (data: { email: string; password: string }) =>
    api.post<{ data: AuthResponse }>('/auth/login', data).then((r) => r.data.data),

  logout: () => api.post('/auth/logout'),

  logoutAll: () => api.post('/auth/logout-all'),

  refresh: () => api.post<{ data: { accessToken: string; sessionId: string } }>('/auth/refresh').then((r) => r.data.data),

  me: () => api.get<{ data: AuthResponse['user'] }>('/auth/me').then((r) => r.data.data),

  oauthLogin: (provider: OAuthProvider, data: { code: string; redirectUri: string; state?: string }) =>
    api.post<{ data: AuthResponse }>(`/auth/oauth/${provider}`, data).then((r) => r.data.data),

  forgotPassword: (email: string) =>
    api.post<{ data: { message: string } }>('/auth/forgot-password', { email }).then((r) => r.data.data),

  resetPassword: (data: { token: string; newPassword: string }) =>
    api.post<{ data: { message: string } }>('/auth/reset-password', data).then((r) => r.data.data),

  validateResetPasswordToken: (token: string) =>
    api.get<{ data: { valid: boolean; reason: 'ok' | 'invalid' | 'expired' | 'used' } }>('/auth/reset-password/validate', {
      params: { token },
    }).then((r) => r.data.data),

  verifyEmail: (token: string) =>
    api.get<{ data: { verified: boolean } }>('/auth/verify-email', { params: { token } }).then((r) => r.data.data),

  resendVerificationEmail: (email: string) =>
    api.post<{ data: { sent: boolean } }>('/auth/resend-verification', { email }).then((r) => r.data.data),

  changePassword: (data: { currentPassword: string; newPassword: string }) =>
    api.patch<{ data: { changed: boolean } }>('/auth/change-password', data).then((r) => r.data.data),

  listSessions: () =>
    api.get<{ data: Array<{ id: string; userAgent?: string | null; ipAddress?: string | null; country?: string | null; lastUsedAt?: string | null; createdAt: string; expiresAt: string }> }>('/auth/sessions')
      .then((r) => r.data.data),

  logoutSession: (sessionId: string) => api.delete(`/auth/sessions/${sessionId}`),

  listEmailPreviews: (limit = 30) =>
    api.get<{ data: Array<{ id: string; to: string; subject: string; kind: string; createdAt: string }> }>('/auth/email-previews', {
      params: { limit },
    }).then((r) => r.data.data),

  getEmailPreview: (id: string) =>
    api.get<{ data: { id: string; to: string; subject: string; kind: string; html: string; createdAt: string } }>(`/auth/email-previews/${id}`)
      .then((r) => r.data.data),
};
