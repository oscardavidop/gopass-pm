export type EmailTemplateType =
  | 'reset_password'
  | 'welcome'
  | 'project_invitation'
  | 'task_assigned'
  | 'task_reassigned'
  | 'task_due_reminder'
  | 'weekly_digest';

export type EmailProviderName = 'zavu' | 'preview';

export type TemplateScalar = string | number | boolean | Date | null | undefined;
export type SemanticTemplateVariables = Record<string, TemplateScalar>;

export interface ResetPasswordVariables {
  userName: string;
  resetUrl: string;
  expirationTime: string;
  supportEmail: string;
  year: string;
  companyName: string;
  companyAddress: string;
}

export interface WelcomeVariables {
  userName: string;
  appUrl: string;
  supportEmail: string;
  year: string;
  companyName: string;
  companyAddress: string;
}

export interface ProjectInvitationVariables {
  userName: string;
  invitedBy: string;
  projectName: string;
  projectUrl: string;
  supportEmail: string;
  year: string;
  companyName: string;
  companyAddress: string;
}

export interface TaskAssignedVariables {
  userName: string;
  assignedBy: string;
  projectName: string;
  taskTitle: string;
  taskUrl: string;
  supportEmail: string;
  year: string;
  companyName: string;
  companyAddress: string;
}

export interface TaskReassignedVariables {
  userName: string;
  assignedBy: string;
  projectName: string;
  taskTitle: string;
  taskUrl: string;
  supportEmail: string;
  year: string;
  companyName: string;
  companyAddress: string;
}

export interface TaskDueReminderVariables {
  userName: string;
  projectName: string;
  taskTitle: string;
  dueDate: string;
  taskUrl: string;
}

export interface WeeklyDigestVariables {
  userName: string;
  periodLabel: string;
  tasksCreated: number;
  tasksCompleted: number;
  tasksOverdue: number;
  dashboardUrl: string;
}

export interface TemplateVariablesByType {
  reset_password: ResetPasswordVariables;
  welcome: WelcomeVariables;
  project_invitation: ProjectInvitationVariables;
  task_assigned: TaskAssignedVariables;
  task_reassigned: TaskReassignedVariables;
  task_due_reminder: TaskDueReminderVariables;
  weekly_digest: WeeklyDigestVariables;
}

export interface EmailTemplateRegistryEntry {
  type: EmailTemplateType;
  envKey: string;
}

export interface ResolvedTemplate {
  type: EmailTemplateType;
  templateId: string;
  locale: string;
  entry: EmailTemplateRegistryEntry;
}

export interface SendTemplateRequest<T extends EmailTemplateType = EmailTemplateType> {
  template: T;
  to: string;
  variables: TemplateVariablesByType[T];
  userId?: string;
  locale?: string | null;
}

export interface EmailProviderSendInput {
  to: string;
  templateId: string;
  templateVariables: Record<string, string>;
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
  year: string;
}

export interface SendWelcomeEmailInput {
  to: string;
  userId?: string;
  locale?: string | null;
  userName?: string | null;
  appUrl: string;
  supportEmail: string;
  year: string;
  companyName: string;
  companyAddress: string;
}

export interface SendProjectInvitationEmailInput {
  to: string;
  userId?: string;
  locale?: string | null;
  userName?: string | null;
  invitedBy?: string | null;
  projectName: string;
  projectUrl: string;
  supportEmail: string;
  year: string;
  companyName: string;
  companyAddress: string;
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
  companyName: string;
  companyAddress: string;
  supportEmail: string;
  year: string;
}

export interface SendTaskReassignedEmailInput {
  to: string;
  userId?: string;
  locale?: string | null;
  userName?: string | null;
  assignedBy?: string | null;
  projectName: string;
  taskTitle: string;
  taskUrl: string;
  companyName: string;
  companyAddress: string;
  supportEmail: string;
  year: string;
}

export interface SendTaskDueReminderEmailInput {
  to: string;
  userId?: string;
  locale?: string | null;
  userName?: string | null;
  projectName: string;
  taskTitle: string;
  dueDate: string;
  taskUrl: string;
}

export type SendTaskReminderEmailInput = SendTaskDueReminderEmailInput;

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
