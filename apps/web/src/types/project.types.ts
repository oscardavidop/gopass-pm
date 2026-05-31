import type { User } from './auth.types';

export type ProjectStatus = 'ACTIVE' | 'ON_HOLD' | 'COMPLETED' | 'ARCHIVED';
export type ProjectRole = 'OWNER' | 'ADMIN' | 'MEMBER' | 'VIEWER';
export type ProjectVisibility = 'PRIVATE' | 'TEAM' | 'PUBLIC';
export type ProjectWorkflowType = 'DEFAULT' | 'CUSTOM';

export interface ProjectBranding {
  iconUrl: string | null;
  bannerUrl: string | null;
  coverUrl: string | null;
}

export interface ProjectActivityLog {
  id: string;
  action: string;
  entity: string;
  entityId: string;
  oldValue: Record<string, any> | null;
  newValue: Record<string, any> | null;
  createdAt: string;
  user: Pick<User, 'id' | 'firstName' | 'lastName' | 'avatar' | 'collaborationColor'>;
  task?: { id: string; title: string } | null;
}

export interface ProjectInvitation {
  id: string;
  email: string;
  status: 'PENDING' | 'ACCEPTED' | 'DECLINED' | 'EXPIRED';
  role: ProjectRole;
  message?: string | null;
  invitedAt: string;
  acceptedAt?: string | null;
  invitedUserId?: string | null;
  invitedUser?: Pick<User, 'id' | 'firstName' | 'lastName' | 'avatar' | 'email'> | null;
}

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
  icon?: string | null;
  color: string;
  visibility: ProjectVisibility;
  workflowType: ProjectWorkflowType;
  workflowStates: string[];
  priorityLabels?: string[];
  invitePermission?: ProjectRole;
  taskCreatePermission?: ProjectRole;
  notificationSettings?: {
    taskCreated?: boolean;
    taskAssigned?: boolean;
    taskCompleted?: boolean;
    memberAdded?: boolean;
    workflowUpdated?: boolean;
    fileUploaded?: boolean;
  } | null;
  status: ProjectStatus;
  startDate: string | null;
  endDate: string | null;
  ownerId: string;
  owner: Pick<User, 'id' | 'firstName' | 'lastName' | 'avatar'>;
  members: ProjectMember[];
  invitations?: ProjectInvitation[];
  _count: {
    tasks: number;
    members: number;
  };
  branding?: ProjectBranding;
  createdAt: string;
  updatedAt: string;
}

export interface CreateProjectPayload {
  name: string;
  description?: string;
  icon?: string;
  color?: string;
  visibility?: ProjectVisibility;
  workflowType?: ProjectWorkflowType;
  workflowStates?: string[];
  priorityLabels?: string[];
  invitePermission?: ProjectRole;
  taskCreatePermission?: ProjectRole;
  notificationSettings?: {
    taskCreated?: boolean;
    taskAssigned?: boolean;
    taskCompleted?: boolean;
    memberAdded?: boolean;
    workflowUpdated?: boolean;
    fileUploaded?: boolean;
  };
  status?: ProjectStatus;
  startDate?: string;
  endDate?: string;
  members?: Array<{ userId: string; role?: ProjectRole }>;
  invitations?: Array<{ email: string; role?: ProjectRole; message?: string }>;
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
