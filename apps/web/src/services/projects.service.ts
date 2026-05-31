import { api } from './api';
import type {
  Project,
  CreateProjectPayload,
  ProjectFilters,
  PaginatedResponse,
  ProjectInvitation,
  ProjectRole,
  ProjectActivityLog,
} from '@/types/project.types';

export const projectsService = {
  list: (filters?: ProjectFilters) =>
    api
      .get<{ data: PaginatedResponse<Project> }>('/projects', { params: filters })
      .then((r) => r.data.data),

  get: (id: string) =>
    api.get<{ data: Project }>(`/projects/${id}`).then((r) => r.data.data),

  getActivity: (id: string, limit = 100) =>
    api.get<{ data: ProjectActivityLog[] }>(`/projects/${id}/activity`, { params: { limit } }).then((r) => r.data.data),

  create: (payload: CreateProjectPayload) =>
    api.post<{ data: Project }>('/projects', payload).then((r) => r.data.data),

  update: (id: string, payload: Partial<CreateProjectPayload>) =>
    api.patch<{ data: Project }>(`/projects/${id}`, payload).then((r) => r.data.data),

  remove: (id: string) => api.delete(`/projects/${id}`),

  leave: (projectId: string) =>
    api.post(`/projects/${projectId}/leave`),

  addMember: (projectId: string, userId: string) =>
    api.post(`/projects/${projectId}/members/${userId}`),

  updateMemberRole: (projectId: string, userId: string, role: ProjectRole) =>
    api.patch(`/projects/${projectId}/members/${userId}/role`, { role }),

  transferOwnership: (projectId: string, userId: string) =>
    api.post<{ data: Project }>(`/projects/${projectId}/transfer-ownership`, { userId }).then((r) => r.data.data),

  removeMember: (projectId: string, userId: string) =>
    api.delete(`/projects/${projectId}/members/${userId}`),

  listInvitations: (projectId: string) =>
    api.get<{ data: ProjectInvitation[] }>(`/projects/${projectId}/invitations`).then((r) => r.data.data),

  inviteMember: (projectId: string, payload: { email: string; role?: ProjectRole; message?: string }) =>
    api.post<{ data: { mode: 'existing_user' | 'pending_invite'; invitation: ProjectInvitation } }>(
      `/projects/${projectId}/invitations`,
      payload,
    ).then((r) => r.data.data),
};
