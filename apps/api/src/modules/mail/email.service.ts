import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { PrismaService } from '../../shared/database/prisma.service';
import {
  EMAIL_PROVIDER_TOKEN,
  EMAIL_TEMPLATE_BY_TYPE,
} from './email.registry';
import {
  EmailProvider,
  ResolvedTemplate,
  SendEmailVerificationEmailInput,
  SendProjectInvitationEmailInput,
  SendResetPasswordEmailInput,
  SendTaskAssignedEmailInput,
  SendTaskDueReminderEmailInput,
  SendTaskReassignedEmailInput,
  SendTemplateRequest,
  SendWeeklyDigestEmailInput,
  SendWelcomeEmailInput,
} from './email.types';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
    @Inject(EMAIL_PROVIDER_TOKEN) private readonly provider: EmailProvider,
  ) {}

  async sendEmailVerificationEmail(input: SendEmailVerificationEmailInput) {
    return this.sendTemplate({
      template: 'email_verification',
      to: input.to,
      userId: input.userId,
      locale: input.locale,
      variables: {
        userName: input.userName || 'there',
        verificationUrl: input.verificationUrl,
        expirationTime: input.expirationTime,
        companyName: input.companyName,
        supportEmail: input.supportEmail,
        year: input.year,
        companyAddress: input.companyAddress,
      },
    });
  }

  async sendTemplate(input: SendTemplateRequest) {
    const resolved = this.resolveTemplate(input.template, input.locale);
    const semanticVariables = this.normalizeTemplateVariables(input.variables);

    const basePayload = {
      template: resolved.type,
      templateId: resolved.templateId,
      locale: resolved.locale,
      recipient: input.to,
      variables: semanticVariables,
    };

    const sendRealEmail = this.shouldSendRealEmail();
    if (!sendRealEmail) {
      const log = await this.prisma.emailLog.create({
        data: {
          userId: input.userId,
          templateType: resolved.type,
          templateId: resolved.templateId || null,
          recipient: input.to,
          status: 'PREVIEW',
          provider: 'preview',
          variables: this.toJsonValue(semanticVariables),
          payload: this.toJsonValue(basePayload),
        },
      });

      this.logger.log(`Email preview stored: ${resolved.type} -> ${input.to}`);
      return { preview: true, logId: log.id, ...basePayload };
    }

    if (!resolved.templateId) {
      throw new Error(`Missing template id for ${resolved.type}`);
    }

    try {
      const providerResult = await this.provider.sendTemplate({
        to: input.to,
        templateId: resolved.templateId,
        templateVariables: semanticVariables,
      });

      console.log(`Email sent: ${resolved.type} -> ${input.to} via ${providerResult.provider}`, resolved);

      const log = await this.prisma.emailLog.create({
        data: {
          userId: input.userId,
          templateType: resolved.type,
          templateId: resolved.templateId,
          recipient: input.to,
          status: 'SENT',
          provider: providerResult.provider,
          providerMessageId: providerResult.providerMessageId,
          sentAt: new Date(),
          variables: this.toJsonValue(semanticVariables),
          payload: this.toJsonValue(basePayload),
        },
      });

      return {
        preview: false,
        logId: log.id,
        providerMessageId: providerResult.providerMessageId,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      await this.prisma.emailLog.create({
        data: {
          userId: input.userId,
          templateType: resolved.type,
          templateId: resolved.templateId || null,
          recipient: input.to,
          status: 'FAILED',
          provider: 'zavu',
          variables: this.toJsonValue(semanticVariables),
          payload: this.toJsonValue(basePayload),
          error: message,
        },
      });
      throw error;
    }
  }

  async listPreviews(limit = 25) {
    return this.prisma.emailLog.findMany({
      where: { status: 'PREVIEW' },
      orderBy: { createdAt: 'desc' },
      take: Math.min(Math.max(limit, 1), 100),
      select: {
        id: true,
        templateType: true,
        templateId: true,
        recipient: true,
        status: true,
        provider: true,
        payload: true,
        createdAt: true,
      },
    });
  }

  async getPreview(id: string) {
    return this.prisma.emailLog.findFirst({
      where: { id, status: 'PREVIEW' },
      select: {
        id: true,
        userId: true,
        templateType: true,
        templateId: true,
        recipient: true,
        status: true,
        provider: true,
        payload: true,
        variables: true,
        createdAt: true,
      },
    });
  }

  async sendResetPasswordEmail(input: SendResetPasswordEmailInput) {
    return this.sendTemplate({
      template: 'reset_password',
      to: input.to,
      userId: input.userId,
      locale: input.locale,
      variables: {
        userName: input.userName || 'there',
        resetUrl: input.resetUrl,
        expirationTime: input.expirationTime,
        companyName: input.companyName,
        supportEmail: input.supportEmail,
        year: input.year,
        companyAddress: input.companyAddress,
      },
    });
  }

  async sendWelcomeEmail(input: SendWelcomeEmailInput) {
    return this.sendTemplate({
      template: 'welcome',
      to: input.to,
      userId: input.userId,
      locale: input.locale,
      variables: {
        userName: input.userName || 'there',
        appUrl: input.appUrl,
        supportEmail: input.supportEmail,
        year: input.year,
        companyName: input.companyName,
        companyAddress: input.companyAddress,
      },
    });
  }

  async sendProjectInvitationEmail(input: SendProjectInvitationEmailInput) {
    return this.sendTemplate({
      template: 'project_invitation',
      to: input.to,
      userId: input.userId,
      locale: input.locale,
      variables: {
        userName: input.userName || 'there',
        invitedBy: input.invitedBy || 'A team member',
        projectName: input.projectName,
        projectUrl: input.projectUrl,
        supportEmail: input.supportEmail,
        year: input.year,
        companyName: input.companyName,
        companyAddress: input.companyAddress,
      },
    });
  }

  async sendTaskAssignedEmail(input: SendTaskAssignedEmailInput) {
    return this.sendTemplate({
      template: 'task_assigned',
      to: input.to,
      userId: input.userId,
      locale: input.locale,
      variables: {
        userName: input.userName || 'there',
        assignedBy: input.assignedBy || 'A teammate',
        projectName: input.projectName,
        taskTitle: input.taskTitle,
        taskUrl: input.taskUrl,
        companyName: input.companyName,
        companyAddress: input.companyAddress,
        supportEmail: input.supportEmail,
        year: input.year,
      },
    });
  }

  async sendTaskReassignedEmail(input: SendTaskReassignedEmailInput) {
    return this.sendTemplate({
      template: 'task_reassigned',
      to: input.to,
      userId: input.userId,
      locale: input.locale,
      variables: {
        userName: input.userName || 'there',
        assignedBy: input.assignedBy || 'A teammate',
        projectName: input.projectName,
        taskTitle: input.taskTitle,
        taskUrl: input.taskUrl,
        companyName: input.companyName,
        companyAddress: input.companyAddress,
        supportEmail: input.supportEmail,
        year: input.year,
      },
    });
  }

  async sendTaskDueReminderEmail(input: SendTaskDueReminderEmailInput) {
    return this.sendTemplate({
      template: 'task_due_reminder',
      to: input.to,
      userId: input.userId,
      locale: input.locale,
      variables: {
        userName: input.userName || 'there',
        projectName: input.projectName,
        taskTitle: input.taskTitle,
        dueDate: input.dueDate,
        taskUrl: input.taskUrl,
      },
    });
  }

  async sendTaskReminderEmail(input: SendTaskDueReminderEmailInput) {
    return this.sendTaskDueReminderEmail(input);
  }

  async sendWeeklyDigestEmail(input: SendWeeklyDigestEmailInput) {
    return this.sendTemplate({
      template: 'weekly_digest',
      to: input.to,
      userId: input.userId,
      locale: input.locale,
      variables: {
        userName: input.userName || 'there',
        periodLabel: input.periodLabel,
        tasksCreated: input.tasksCreated,
        tasksCompleted: input.tasksCompleted,
        tasksOverdue: input.tasksOverdue,
        dashboardUrl: input.dashboardUrl,
      },
    });
  }

  private resolveTemplate(type: SendTemplateRequest['template'], locale?: string | null): ResolvedTemplate {
    const entry = EMAIL_TEMPLATE_BY_TYPE[type];
    if (!entry) {
      throw new Error(`Unknown template type: ${type}`);
    }

    const normalizedLocale = this.normalizeLocale(locale);
    const localizedEnvKey = `${entry.envKey}_${normalizedLocale.toUpperCase()}`;

    const localizedTemplateId = this.config.get<string>(localizedEnvKey);
    const defaultTemplateId = this.config.get<string>(entry.envKey);

    const templateId = (localizedTemplateId || defaultTemplateId || '').trim();

    return {
      type,
      templateId,
      locale: normalizedLocale,
      entry,
    };
  }

  private normalizeTemplateVariables<T extends object>(variables: T): Record<string, string> {
    const normalized: Record<string, string> = {};
    for (const [name, value] of Object.entries(variables as Record<string, unknown>)) {
      normalized[name] = this.stringify(value);
    }
    return normalized;
  }

  private normalizeLocale(locale?: string | null) {
    const source = (locale || this.config.get<string>('DEFAULT_LOCALE', 'en')).toLowerCase();
    const two = source.split('-')[0];
    return two || 'en';
  }

  private shouldSendRealEmail() {
    return String(this.config.get('SEND_REAL_EMAIL', 'false')).toLowerCase() === 'true';
  }

  private stringify(value: unknown) {
    if (value === null || value === undefined) return '';
    if (value instanceof Date) return value.toISOString();
    if (typeof value === 'string') return value;
    if (typeof value === 'number' || typeof value === 'boolean') return String(value);
    return JSON.stringify(value);
  }

  private toJsonValue(value: unknown) {
    return JSON.parse(JSON.stringify(value ?? {}));
  }
}
