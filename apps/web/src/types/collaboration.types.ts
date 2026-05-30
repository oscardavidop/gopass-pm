export type PresenceStatus = 'online' | 'idle' | 'offline';

export interface CollaborationUser {
  id: string;
  firstName: string;
  lastName: string;
  avatar?: string | null;
  collaborationColor?: string | null;
  socketId?: string;
  status?: PresenceStatus;
}

export interface TaskPresenceState {
  viewing: CollaborationUser[];
  editing: Array<{ user: CollaborationUser; field?: string }>;
}

export interface TaskHighlight {
  taskId: string;
  projectId: string;
  actor?: CollaborationUser;
  kind: 'created' | 'updated' | 'moved' | 'deleted';
  message: string;
  from?: string;
  to?: string;
  timestamp: string;
  expiresAt: number;
}
