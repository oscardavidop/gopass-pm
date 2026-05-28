import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { projectsService } from '@/services/projects.service';
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

export function useCreateProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateProjectPayload) => projectsService.create(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: projectKeys.all });
      toast.success('Project created');
    },
    onError: () => toast.error('Failed to create project'),
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
      toast.success('Project updated');
    },
    onError: () => toast.error('Failed to update project'),
  });
}

export function useDeleteProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => projectsService.remove(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: projectKeys.all });
      toast.success('Project deleted');
    },
    onError: () => toast.error('Failed to delete project'),
  });
}
