import { api } from './api';
import type { User } from '@/types/auth.types';

export interface UpdateProfilePayload {
  firstName?: string;
  lastName?: string;
  bio?: string;
  avatar?: string;
}

export const usersService = {
  /** List all users, optionally filtered by search */
  list: (search?: string): Promise<User[]> =>
    api.get<{ data: User[] }>('/users', { params: search ? { search } : {} }).then((r) => r.data.data),

  /** Get current user's profile */
  getMe: (): Promise<User> =>
    api.get<{ data: User }>('/users/me').then((r) => r.data.data),

  /** Update current user's profile */
  updateMe: (payload: UpdateProfilePayload): Promise<User> =>
    api.patch<{ data: User }>('/users/me', payload).then((r) => r.data.data),
};
