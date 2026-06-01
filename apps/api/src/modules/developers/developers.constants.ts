export const DEVELOPER_DOCS_URL = 'https://tasku.readme.io/';

export const DEVELOPER_SCOPE_GROUPS = [
  {
    label: 'Projects',
    values: ['projects:read', 'projects:write'],
  },
  {
    label: 'Tasks',
    values: ['tasks:read', 'tasks:write'],
  },
  {
    label: 'Files',
    values: ['files:read', 'files:write'],
  },
  {
    label: 'Notifications',
    values: ['notifications:read'],
  },
  {
    label: 'Developers',
    values: ['developers:read', 'developers:write'],
  },
  {
    label: 'Webhooks',
    values: ['webhooks:read', 'webhooks:write'],
  },
  {
    label: 'Users',
    values: ['users:read'],
  },
] as const;

export const DEVELOPER_WEBHOOK_EVENT_GROUPS = [
  {
    label: 'Tasks',
    values: ['task.created', 'task.updated', 'task.completed', 'task.deleted', 'task.comment.created'],
  },
  {
    label: 'Projects',
    values: ['project.created', 'project.updated', 'project.deleted', 'project.member.added'],
  },
] as const;

export const DEFAULT_API_SCOPES = ['projects:read', 'tasks:read'];
export const DEFAULT_WEBHOOK_EVENTS = ['task.created', 'task.updated'];
export const WEBHOOK_RETRY_DELAYS_MS = [60_000, 300_000, 900_000];

export const ALL_DEVELOPER_SCOPES = DEVELOPER_SCOPE_GROUPS.flatMap((group) => group.values);
export const ALL_WEBHOOK_EVENTS = DEVELOPER_WEBHOOK_EVENT_GROUPS.flatMap((group) => group.values);
