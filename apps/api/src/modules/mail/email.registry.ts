import { EmailTemplateRegistryEntry, EmailTemplateType } from './email.types';

export const EMAIL_TEMPLATES = {
  EMAIL_VERIFICATION: {
    type: 'email_verification',
    envKey: 'ZAVU_TEMPLATE_EMAIL_VERIFICATION',
  },
  RESET_PASSWORD: {
    type: 'reset_password',
    envKey: 'ZAVU_TEMPLATE_RESET_PASSWORD',
  },
  WELCOME: {
    type: 'welcome',
    envKey: 'ZAVU_TEMPLATE_WELCOME',
  },
  PROJECT_INVITATION: {
    type: 'project_invitation',
    envKey: 'ZAVU_TEMPLATE_PROJECT_INVITATION',
  },
  TASK_ASSIGNED: {
    type: 'task_assigned',
    envKey: 'ZAVU_TEMPLATE_TASK_ASSIGNED',
  },
  TASK_REASSIGNED: {
    type: 'task_reassigned',
    envKey: 'ZAVU_TEMPLATE_TASK_REASSIGNED',
  },
  TASK_DUE_REMINDER: {
    type: 'task_due_reminder',
    envKey: 'ZAVU_TEMPLATE_TASK_DUE_REMINDER',
  },
  WEEKLY_DIGEST: {
    type: 'weekly_digest',
    envKey: 'ZAVU_TEMPLATE_WEEKLY_DIGEST',
  },
} as const satisfies Record<string, EmailTemplateRegistryEntry>;

export const EMAIL_TEMPLATE_LIST = Object.values(EMAIL_TEMPLATES);

export const EMAIL_TEMPLATE_BY_TYPE = EMAIL_TEMPLATE_LIST.reduce(
  (acc, entry) => {
    acc[entry.type] = entry;
    return acc;
  },
  {} as Record<EmailTemplateType, EmailTemplateRegistryEntry>,
);

export const EMAIL_PROVIDER_TOKEN = 'EMAIL_PROVIDER';
