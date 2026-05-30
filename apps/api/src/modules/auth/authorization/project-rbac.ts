import { ProjectRole, Role } from '@prisma/client';

export type ProjectPermission =
  | 'project.read'
  | 'project.update'
  | 'project.delete'
  | 'project.member.manage'
  | 'project.invitation.manage'
  | 'project.leave'
  | 'task.write'
  | 'comment.write';

export const PROJECT_RBAC_MATRIX: Record<ProjectRole, ProjectPermission[]> = {
  OWNER: [
    'project.read',
    'project.update',
    'project.delete',
    'project.member.manage',
    'project.invitation.manage',
    'project.leave',
    'task.write',
    'comment.write',
  ],
  ADMIN: [
    'project.read',
    'project.update',
    'project.member.manage',
    'project.invitation.manage',
    'project.leave',
    'task.write',
    'comment.write',
  ],
  MEMBER: [
    'project.read',
    'project.leave',
    'task.write',
    'comment.write',
  ],
  VIEWER: [
    'project.read',
    'project.leave',
  ],
};

export function hasProjectPermission(
  projectRole: ProjectRole | null | undefined,
  permission: ProjectPermission,
  platformRole?: Role,
) {
  if (platformRole === Role.ADMIN) return true;
  if (!projectRole) return false;
  return PROJECT_RBAC_MATRIX[projectRole].includes(permission);
}