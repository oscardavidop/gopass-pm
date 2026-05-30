import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { usersService, type UpdateProfilePayload } from '@/services/users.service';
import { useAuthStore } from '@/store/auth.store';
import type { User } from '@/types/auth.types';
import { translateByKey } from '@/i18n/translate';
import { getApiErrorMessage } from '@/services/api-error';

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
      toast.success(translateByKey('profile.saved', undefined, 'Profile saved'));
    },
    onError: (err) => toast.error(getApiErrorMessage(err, 'profile.saveFailed', 'Failed to save profile')),
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
      toast.success(translateByKey('project.memberAdded', undefined, 'Member added'));
    },
    onError: (err) => toast.error(getApiErrorMessage(err, 'project.memberAddFailed', 'Failed to add member')),
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
      toast.success(translateByKey('project.memberRemoved', undefined, 'Member removed'));
    },
    onError: (err) => toast.error(getApiErrorMessage(err, 'project.memberRemoveFailed', 'Failed to remove member')),
  });
}

export function useLeaveProject(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () =>
      import('@/services/projects.service').then((m) => m.projectsService.leave(projectId)),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['projects', 'detail', projectId] });
      qc.invalidateQueries({ queryKey: ['projects', 'list'] });
      qc.invalidateQueries({ queryKey: ['projects'] });
      toast.success(translateByKey('project.left', undefined, 'You left the project'));
    },
    onError: (err) => toast.error(getApiErrorMessage(err, 'project.leaveFailed', 'Failed to leave project')),
  });
}

export function useUpdateMemberRole(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: 'OWNER' | 'ADMIN' | 'MEMBER' | 'VIEWER' }) =>
      import('@/services/projects.service').then((m) => m.projectsService.updateMemberRole(projectId, userId, role)),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['projects', 'detail', projectId] });
      qc.invalidateQueries({ queryKey: ['projects', 'list'] });
      toast.success(translateByKey('project.roleUpdated', undefined, 'Role updated'));
    },
    onError: (err) => toast.error(getApiErrorMessage(err, 'project.roleUpdateFailed', 'Failed to update role')),
  });
}

export function useInviteMember(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: { email: string; role?: 'OWNER' | 'ADMIN' | 'MEMBER' | 'VIEWER'; message?: string }) =>
      import('@/services/projects.service').then((m) => m.projectsService.inviteMember(projectId, payload)),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['projects', 'detail', projectId] });
      qc.invalidateQueries({ queryKey: ['projects', 'list'] });
      toast.success(translateByKey('project.invitationSent', undefined, 'Invitation sent'));
    },
    onError: (err) => toast.error(getApiErrorMessage(err, 'project.invitationFailed', 'Failed to send invitation')),
  });
}
