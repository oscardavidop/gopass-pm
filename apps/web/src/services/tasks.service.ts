import { api } from './api';
import type {
  Task,
  TaskWithDetail,
  CreateTaskPayload,
  TaskFilters,
  ActivityLog,
  Subtask,
} from '@/types/task.types';
import type { PaginatedResponse } from '@/types/project.types';

export const tasksService = {
  listByProject: (projectId: string, filters?: TaskFilters) =>
    api
      .get<{ data: PaginatedResponse<Task> }>(`/projects/${projectId}/tasks`, { params: filters })
      .then((r) => r.data.data),

  get: (taskId: string) =>
    api.get<{ data: TaskWithDetail }>(`/tasks/${taskId}`).then((r) => r.data.data),

  create: (projectId: string, payload: CreateTaskPayload) =>
    api.post<{ data: Task }>(`/projects/${projectId}/tasks`, payload).then((r) => r.data.data),

  update: (taskId: string, payload: Partial<CreateTaskPayload>) =>
    api.patch<{ data: Task }>(`/tasks/${taskId}`, payload).then((r) => r.data.data),

  updateStatus: (taskId: string, status: string) =>
    api.patch<{ data: Task }>(`/tasks/${taskId}/status`, { status }).then((r) => r.data.data),

  remove: (taskId: string) => api.delete(`/tasks/${taskId}`),

  getActivity: (taskId: string) =>
    api.get<{ data: ActivityLog[] }>(`/tasks/${taskId}/activity`).then((r) => r.data.data),

  addComment: (taskId: string, content: string) =>
    api.post(`/tasks/${taskId}/comments`, { content }).then((r) => r.data.data),

  deleteComment: (taskId: string, commentId: string) =>
    api.delete(`/tasks/${taskId}/comments/${commentId}`),

  addSubtask: (taskId: string, payload: { title: string; completed?: boolean; inProgress?: boolean }) =>
    api.post<{ data: Subtask }>(`/tasks/${taskId}/subtasks`, payload).then((r) => r.data.data),

  updateSubtask: (
    taskId: string,
    subtaskId: string,
    payload: Partial<Pick<Subtask, 'title' | 'completed' | 'inProgress' | 'position'>>,
  ) => api.patch<{ data: Subtask }>(`/tasks/${taskId}/subtasks/${subtaskId}`, payload).then((r) => r.data.data),

  deleteSubtask: (taskId: string, subtaskId: string) =>
    api.delete(`/tasks/${taskId}/subtasks/${subtaskId}`),

  reorderSubtasks: (taskId: string, orderedIds: string[]) =>
    api.patch<{ data: Subtask[] }>(`/tasks/${taskId}/subtasks/reorder`, { orderedIds }).then((r) => r.data.data),
};
