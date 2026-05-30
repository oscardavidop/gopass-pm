import { EmailTemplateRegistryEntry, EmailTemplateType } from './email.types';

export const EMAIL_TEMPLATES = {
  RESET_PASSWORD: {
    type: 'reset_password',
    envKey: 'ZAVU_TEMPLATE_RESET_PASSWORD',
    variableMap: {
      userName: '1',
      resetUrl: '2',
      expirationTime: '3',
      supportEmail: '4',
      year: '5',
      companyName: '6',
      companyAddress: '7',
    },
  },
  WELCOME: {
    type: 'welcome',
    envKey: 'ZAVU_TEMPLATE_WELCOME',
    variableMap: {
      userName: '1',
      appUrl: '2',
    },
  },
  PROJECT_INVITATION: {
    type: 'project_invitation',
    envKey: 'ZAVU_TEMPLATE_PROJECT_INVITATION',
    variableMap: {
      userName: '1',
      invitedBy: '2',
      projectName: '3',
      projectUrl: '4',
    },
  },
  TASK_ASSIGNED: {
    type: 'task_assigned',
    envKey: 'ZAVU_TEMPLATE_TASK_ASSIGNED',
    variableMap: {
      userName: '1',
      assignedBy: '2',
      projectName: '3',
      taskTitle: '4',
      taskUrl: '5',
    },
  },
  TASK_DUE_REMINDER: {
    type: 'task_due_reminder',
    envKey: 'ZAVU_TEMPLATE_TASK_DUE_REMINDER',
    variableMap: {
      userName: '1',
      projectName: '2',
      taskTitle: '3',
      dueDate: '4',
      taskUrl: '5',
    },
  },
  WEEKLY_DIGEST: {
    type: 'weekly_digest',
    envKey: 'ZAVU_TEMPLATE_WEEKLY_DIGEST',
    variableMap: {
      userName: '1',
      periodLabel: '2',
      tasksCreated: '3',
      tasksCompleted: '4',
      tasksOverdue: '5',
      dashboardUrl: '6',
    },
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
