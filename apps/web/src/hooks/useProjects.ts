import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { projectsService } from '@/services/projects.service';
import { translateByKey } from '@/i18n/translate';
import { getApiErrorMessage } from '@/services/api-error';
import type { ProjectFilters, CreateProjectPayload } from '@/types/project.types';

export const projectKeys = {
  all: ['projects'] as const,
  list: (filters?: ProjectFilters) => [...projectKeys.all, 'list', filters] as const,
  detail: (id: string) => [...projectKeys.all, 'detail', id] as const,
};

export function useProjects(filters?: ProjectFilters) {
  return useQuery({
    queryKey: projectKeys.list(filters),
    queryFn: () => projectsService.list(filters),
  });
}

export function useProject(id: string) {
  return useQuery({
    queryKey: projectKeys.detail(id),
    queryFn: () => projectsService.get(id),
    enabled: !!id,
  });
}

export function useProjectActivity(id: string, limit = 100) {
  return useQuery({
    queryKey: [...projectKeys.detail(id), 'activity', limit],
    queryFn: () => projectsService.getActivity(id, limit),
    enabled: !!id,
  });
}

export function useCreateProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateProjectPayload) => projectsService.create(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: projectKeys.all });
      toast.success(translateByKey('project.created', undefined, 'Project created'));
    },
    onError: (err) => toast.error(getApiErrorMessage(err, 'project.createFailed', 'Failed to create project')),
  });
}

export function useUpdateProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CreateProjectPayload> }) =>
      projectsService.update(id, data),
    onSuccess: (_r, vars) => {
      qc.invalidateQueries({ queryKey: projectKeys.detail(vars.id) });
      qc.invalidateQueries({ queryKey: projectKeys.all });
      toast.success(translateByKey('project.updated', undefined, 'Project updated'));
    },
    onError: (err) => toast.error(getApiErrorMessage(err, 'project.updateFailed', 'Failed to update project')),
  });
}

export function useDeleteProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => projectsService.remove(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: projectKeys.all });
      toast.success(translateByKey('project.deleted', undefined, 'Project deleted'));
    },
    onError: (err) => toast.error(getApiErrorMessage(err, 'project.deleteFailed', 'Failed to delete project')),
  });
}

export function useTransferProjectOwnership() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, userId }: { id: string; userId: string }) => projectsService.transferOwnership(id, userId),
    onSuccess: (_r, vars) => {
      qc.invalidateQueries({ queryKey: projectKeys.detail(vars.id) });
      qc.invalidateQueries({ queryKey: projectKeys.all });
      toast.success(translateByKey('project.ownershipTransferred', undefined, 'Project ownership transferred'));
    },
    onError: (err) => toast.error(getApiErrorMessage(err, 'project.ownershipTransferFailed', 'Failed to transfer ownership')),
  });
}
