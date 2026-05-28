import { api } from './api';
import type { Project, CreateProjectPayload, ProjectFilters, PaginatedResponse } from '@/types/project.types';

export const projectsService = {
  list: (filters?: ProjectFilters) =>
    api
      .get<{ data: PaginatedResponse<Project> }>('/projects', { params: filters })
      .then((r) => r.data.data),

  get: (id: string) =>
    api.get<{ data: Project }>(`/projects/${id}`).then((r) => r.data.data),

  create: (payload: CreateProjectPayload) =>
    api.post<{ data: Project }>('/projects', payload).then((r) => r.data.data),

  update: (id: string, payload: Partial<CreateProjectPayload>) =>
    api.patch<{ data: Project }>(`/projects/${id}`, payload).then((r) => r.data.data),

  remove: (id: string) => api.delete(`/projects/${id}`),

  addMember: (projectId: string, userId: string) =>
    api.post(`/projects/${projectId}/members/${userId}`),

  removeMember: (projectId: string, userId: string) =>
    api.delete(`/projects/${projectId}/members/${userId}`),
};
