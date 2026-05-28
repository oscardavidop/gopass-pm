import type { User } from './auth.types';

export type ProjectStatus = 'ACTIVE' | 'ON_HOLD' | 'COMPLETED' | 'ARCHIVED';
export type ProjectRole = 'OWNER' | 'ADMIN' | 'MEMBER';

export interface ProjectMember {
  id: string;
  role: ProjectRole;
  joinedAt: string;
  userId: string;
  user: Pick<User, 'id' | 'firstName' | 'lastName' | 'avatar' | 'email'>;
}

export interface Project {
  id: string;
  name: string;
  description: string | null;
  color: string;
  status: ProjectStatus;
  startDate: string | null;
  endDate: string | null;
  ownerId: string;
  owner: Pick<User, 'id' | 'firstName' | 'lastName' | 'avatar'>;
  members: ProjectMember[];
  _count: {
    tasks: number;
    members: number;
  };
  createdAt: string;
  updatedAt: string;
}

export interface CreateProjectPayload {
  name: string;
  description?: string;
  color?: string;
  status?: ProjectStatus;
  startDate?: string;
  endDate?: string;
}

export interface ProjectFilters {
  search?: string;
  status?: ProjectStatus;
  page?: number;
  limit?: number;
  sortBy?: string;
  order?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> {
  items: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}
