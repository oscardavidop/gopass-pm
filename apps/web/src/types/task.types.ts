import type { User } from './auth.types';

export type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'REVIEW' | 'DONE';
export type Priority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export const TASK_STATUS_COLUMNS: TaskStatus[] = ['TODO', 'IN_PROGRESS', 'REVIEW', 'DONE'];

export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  TODO: 'To Do',
  IN_PROGRESS: 'In Progress',
  REVIEW: 'In Review',
  DONE: 'Done',
};

export const PRIORITY_LABELS: Record<Priority, string> = {
  LOW: 'Low',
  MEDIUM: 'Medium',
  HIGH: 'High',
  CRITICAL: 'Critical',
};

export const PRIORITY_COLORS: Record<Priority, string> = {
  LOW: 'text-slate-400',
  MEDIUM: 'text-blue-400',
  HIGH: 'text-amber-400',
  CRITICAL: 'text-red-500',
};

export interface Task {
  id: string;
  title: string;
  description: string | null;
  priority: Priority;
  status: TaskStatus;
  dueDate: string | null;
  position: number;
  tags: string[];
  projectId: string;
  assigneeId: string | null;
  assignee: Pick<User, 'id' | 'firstName' | 'lastName' | 'avatar'> | null;
  creator: Pick<User, 'id' | 'firstName' | 'lastName' | 'avatar'>;
  _count: { comments: number };
  createdAt: string;
  updatedAt: string;
}

export interface Comment {
  id: string;
  content: string;
  authorId: string;
  author: Pick<User, 'id' | 'firstName' | 'lastName' | 'avatar'>;
  createdAt: string;
  updatedAt: string;
}

export interface ActivityLog {
  id: string;
  action: string;
  entity: string;
  entityId: string;
  oldValue: Record<string, any> | null;
  newValue: Record<string, any> | null;
  createdAt: string;
  user: Pick<User, 'id' | 'firstName' | 'lastName' | 'avatar'>;
  task: { id: string; title: string } | null;
}

export interface TaskWithDetail extends Task {
  comments: Comment[];
  activityLogs: ActivityLog[];
}

export interface CreateTaskPayload {
  title: string;
  description?: string;
  priority?: Priority;
  status?: TaskStatus;
  dueDate?: string;
  assigneeId?: string;
  tags?: string[];
  position?: number;
}

export interface TaskFilters {
  search?: string;
  status?: TaskStatus;
  priority?: Priority;
  assigneeId?: string;
  page?: number;
  limit?: number;
}
