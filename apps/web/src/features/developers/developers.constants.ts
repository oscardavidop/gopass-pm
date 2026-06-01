import type { PremiumMultiSelectGroup } from '@/components/ui/PremiumMultiSelect';

export const DEVELOPER_SCOPE_GROUPS: PremiumMultiSelectGroup[] = [
  {
    label: 'Projects',
    options: [
      { value: 'projects:read', label: 'projects:read', description: 'Read project data' },
      { value: 'projects:write', label: 'projects:write', description: 'Create and update projects' },
    ],
  },
  {
    label: 'Tasks',
    options: [
      { value: 'tasks:read', label: 'tasks:read', description: 'Read tasks and comments' },
      { value: 'tasks:write', label: 'tasks:write', description: 'Create and update tasks' },
    ],
  },
  {
    label: 'Files',
    options: [
      { value: 'files:read', label: 'files:read', description: 'Access file metadata' },
      { value: 'files:write', label: 'files:write', description: 'Upload and manage files' },
    ],
  },
  {
    label: 'Notifications',
    options: [
      { value: 'notifications:read', label: 'notifications:read', description: 'Read notifications' },
    ],
  },
  {
    label: 'Developers',
    options: [
      { value: 'developers:read', label: 'developers:read', description: 'Read developer portal data' },
      { value: 'developers:write', label: 'developers:write', description: 'Manage developer resources' },
    ],
  },
  {
    label: 'Webhooks',
    options: [
      { value: 'webhooks:read', label: 'webhooks:read', description: 'Read webhook configuration' },
      { value: 'webhooks:write', label: 'webhooks:write', description: 'Create and disable webhooks' },
    ],
  },
  {
    label: 'Users',
    options: [
      { value: 'users:read', label: 'users:read', description: 'Read current user profile data' },
    ],
  },
];

export const DEVELOPER_WEBHOOK_EVENT_GROUPS: PremiumMultiSelectGroup[] = [
  {
    label: 'Tasks',
    options: [
      { value: 'task.created', label: 'task.created', description: 'Triggered when a task is created' },
      { value: 'task.updated', label: 'task.updated', description: 'Triggered when a task is updated' },
      { value: 'task.completed', label: 'task.completed', description: 'Triggered when a task is marked done' },
      { value: 'task.deleted', label: 'task.deleted', description: 'Triggered when a task is deleted' },
      { value: 'task.comment.created', label: 'task.comment.created', description: 'Triggered when a comment is added' },
    ],
  },
  {
    label: 'Projects',
    options: [
      { value: 'project.created', label: 'project.created', description: 'Triggered when a project is created' },
      { value: 'project.updated', label: 'project.updated', description: 'Triggered when a project changes' },
      { value: 'project.deleted', label: 'project.deleted', description: 'Triggered when a project is deleted' },
      { value: 'project.member.added', label: 'project.member.added', description: 'Triggered when a member joins the project' },
    ],
  },
];

export const DEFAULT_DEVELOPER_SCOPES = ['projects:read', 'tasks:read'];
export const DEFAULT_WEBHOOK_EVENTS = ['task.created', 'task.updated'];
