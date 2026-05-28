import { api } from './api';
import type { AuthResponse } from '@/types/auth.types';

export const authService = {
  register: (data: { email: string; username: string; password: string; firstName: string; lastName: string }) =>
    api.post<{ data: AuthResponse }>('/auth/register', data).then((r) => r.data.data),

  login: (data: { email: string; password: string }) =>
    api.post<{ data: AuthResponse }>('/auth/login', data).then((r) => r.data.data),

  logout: () => api.post('/auth/logout'),

  refresh: () => api.post<{ data: { accessToken: string } }>('/auth/refresh').then((r) => r.data.data),

  me: () => api.get<{ data: AuthResponse['user'] }>('/auth/me').then((r) => r.data.data),
};
