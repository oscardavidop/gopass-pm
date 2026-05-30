import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { tasksService } from '@/services/tasks.service';
import { translateByKey } from '@/i18n/translate';
import { getApiErrorMessage } from '@/services/api-error';
import type { CreateTaskPayload, TaskFilters, TaskStatus } from '@/types/task.types';

export const taskKeys = {
  byProject: (projectId: string, filters?: TaskFilters) =>
    ['tasks', 'project', projectId, filters] as const,
  detail: (taskId: string) => ['tasks', 'detail', taskId] as const,
  activity: (taskId: string) => ['tasks', 'activity', taskId] as const,
};

export function useProjectTasks(projectId: string, filters?: TaskFilters) {
  return useQuery({
    queryKey: taskKeys.byProject(projectId, filters),
    queryFn: () => tasksService.listByProject(projectId, filters),
    enabled: !!projectId,
  });
}

export function useTask(taskId: string) {
  return useQuery({
    queryKey: taskKeys.detail(taskId),
    queryFn: () => tasksService.get(taskId),
    enabled: !!taskId,
  });
}

export function useCreateTask(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateTaskPayload) => tasksService.create(projectId, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tasks', 'project', projectId] });
      toast.success(translateByKey('task.created', undefined, 'Task created'));
    },
    onError: (err) => toast.error(getApiErrorMessage(err, 'task.createFailed', 'Failed to create task')),
  });
}

export function useUpdateTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CreateTaskPayload> }) =>
      tasksService.update(id, data),
    onSuccess: (_r, vars) => {
      qc.invalidateQueries({ queryKey: taskKeys.detail(vars.id) });
      qc.invalidateQueries({ queryKey: ['tasks'] });
    },
    onError: (err) => toast.error(getApiErrorMessage(err, 'task.updateFailed', 'Failed to update task')),
  });
}

export function useUpdateTaskStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: TaskStatus }) =>
      tasksService.updateStatus(id, status),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tasks'] });
    },
    onError: () => {
      toast.error(translateByKey('task.updateStatusFailed', undefined, 'Failed to update status'));
      qc.invalidateQueries({ queryKey: ['tasks'] });
    },
  });
}

export function useDeleteTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (taskId: string) => tasksService.remove(taskId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tasks'] });
      toast.success(translateByKey('task.deleted', undefined, 'Task deleted'));
    },
  });
}

export function useAddComment(taskId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ content }: { content: string }) => tasksService.addComment(taskId, content),
    onSuccess: () => qc.invalidateQueries({ queryKey: taskKeys.detail(taskId) }),
    onError: () => toast.error(translateByKey('task.commentAddFailed', undefined, 'Failed to add comment')),
  });
}

export function useAddSubtask(taskId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ title }: { title: string }) => tasksService.addSubtask(taskId, title),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: taskKeys.detail(taskId) });
      qc.invalidateQueries({ queryKey: ['tasks'] });
    },
    onError: () => toast.error(translateByKey('task.subtaskAddFailed', undefined, 'Failed to add subtask')),
  });
}

export function useUpdateSubtask(taskId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ subtaskId, data }: { subtaskId: string; data: { title?: string; completed?: boolean; position?: number } }) =>
      tasksService.updateSubtask(taskId, subtaskId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: taskKeys.detail(taskId) });
      qc.invalidateQueries({ queryKey: ['tasks'] });
    },
    onError: () => toast.error(translateByKey('task.subtaskUpdateFailed', undefined, 'Failed to update subtask')),
  });
}

export function useDeleteSubtask(taskId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ subtaskId }: { subtaskId: string }) => tasksService.deleteSubtask(taskId, subtaskId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: taskKeys.detail(taskId) });
      qc.invalidateQueries({ queryKey: ['tasks'] });
    },
    onError: () => toast.error(translateByKey('task.subtaskDeleteFailed', undefined, 'Failed to delete subtask')),
  });
}

export function useReorderSubtasks(taskId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ orderedIds }: { orderedIds: string[] }) => tasksService.reorderSubtasks(taskId, orderedIds),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: taskKeys.detail(taskId) });
      qc.invalidateQueries({ queryKey: ['tasks'] });
    },
    onError: () => toast.error(translateByKey('task.subtaskReorderFailed', undefined, 'Failed to reorder subtasks')),
  });
}
