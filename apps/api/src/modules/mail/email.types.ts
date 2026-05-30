export type EmailTemplateType =
  | 'reset_password'
  | 'welcome'
  | 'project_invitation'
  | 'task_assigned'
  | 'task_due_reminder'
  | 'weekly_digest';

export type EmailProviderName = 'zavu' | 'preview';

export type NamedTemplateVariables = Record<string, unknown>;
export type IndexedTemplateVariables = Record<string, string>;

export interface EmailTemplateRegistryEntry {
  type: EmailTemplateType;
  envKey: string;
  variableMap: Record<string, `${number}`>;
}

export interface ResolvedTemplate {
  type: EmailTemplateType;
  templateId: string;
  locale: string;
  entry: EmailTemplateRegistryEntry;
}

export interface SendTemplateRequest {
  template: EmailTemplateType;
  to: string;
  variables: NamedTemplateVariables;
  userId?: string;
  locale?: string | null;
}

export interface EmailProviderSendInput {
  to: string;
  templateId: string;
  templateVariables: IndexedTemplateVariables;
}

export interface EmailProviderSendResult {
  provider: EmailProviderName;
  providerMessageId?: string;
}

export interface EmailProvider {
  sendTemplate(input: EmailProviderSendInput): Promise<EmailProviderSendResult>;
}

export interface SendResetPasswordEmailInput {
  to: string;
  userId?: string;
  locale?: string | null;
  userName?: string | null;
  resetUrl: string;
  expirationTime: string;
  companyName: string;
  supportEmail: string;
  companyAddress: string;
}

export interface SendWelcomeEmailInput {
  to: string;
  userId?: string;
  locale?: string | null;
  userName?: string | null;
  appUrl: string;
}

export interface SendProjectInvitationEmailInput {
  to: string;
  userId?: string;
  locale?: string | null;
  userName?: string | null;
  invitedBy?: string | null;
  projectName: string;
  projectUrl: string;
}

export interface SendTaskAssignedEmailInput {
  to: string;
  userId?: string;
  locale?: string | null;
  userName?: string | null;
  assignedBy?: string | null;
  projectName: string;
  taskTitle: string;
  taskUrl: string;
}

export interface SendTaskReminderEmailInput {
  to: string;
  userId?: string;
  locale?: string | null;
  userName?: string | null;
  projectName: string;
  taskTitle: string;
  dueDate: string;
  taskUrl: string;
}

export interface SendWeeklyDigestEmailInput {
  to: string;
  userId?: string;
  locale?: string | null;
  userName?: string | null;
  periodLabel: string;
  tasksCreated: number;
  tasksCompleted: number;
  tasksOverdue: number;
  dashboardUrl: string;
}
