import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { usersService, type UpdateProfilePayload } from '@/services/users.service';
import { useAuthStore } from '@/store/auth.store';
import type { User } from '@/types/auth.types';

export const userKeys = {
  all: ['users'] as const,
  list: (search?: string) => [...userKeys.all, 'list', search] as const,
  me: () => [...userKeys.all, 'me'] as const,
};

/** All users (for member picker, assignment, etc.) */
export function useUsers(search?: string) {
  return useQuery({
    queryKey: userKeys.list(search),
    queryFn: () => usersService.list(search),
    staleTime: 60_000,
  });
}

/** Update current user's profile — syncs auth store on success */
export function useUpdateProfile() {
  const qc = useQueryClient();
  const setUser = useAuthStore((s) => s.setUser);

  return useMutation({
    mutationFn: (payload: UpdateProfilePayload) => usersService.updateMe(payload),
    onSuccess: (updated) => {
      // Keep auth store in sync so Navbar/Avatar refresh immediately
      setUser(updated as User);
      qc.setQueryData(userKeys.me(), updated);
      toast.success('Profile saved');
    },
    onError: () => toast.error('Failed to save profile'),
  });
}

/** Hooks for project member management */
export function useAddMember(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) =>
      import('@/services/projects.service').then((m) => m.projectsService.addMember(projectId, userId)),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['projects', 'detail', projectId] });
      qc.invalidateQueries({ queryKey: ['projects', 'list'] });
      toast.success('Member added');
    },
    onError: () => toast.error('Failed to add member'),
  });
}

export function useRemoveMember(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) =>
      import('@/services/projects.service').then((m) => m.projectsService.removeMember(projectId, userId)),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['projects', 'detail', projectId] });
      qc.invalidateQueries({ queryKey: ['projects', 'list'] });
      toast.success('Member removed');
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message ?? 'Failed to remove member';
      toast.error(msg);
    },
  });
}
