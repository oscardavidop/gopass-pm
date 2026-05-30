import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { PrismaService } from '../../shared/database/prisma.service';

export type EmailKind = 'PASSWORD_RESET' | 'WELCOME' | 'INVITATION' | 'PROJECT_ASSIGNMENT';

interface SendEmailInput {
  to: string;
  subject: string;
  html: string;
  kind: EmailKind;
}

interface EmailPreview {
    create: ({ data }: { data: { to: string; subject: string; html: string; kind: EmailKind } }) => Promise<void>;
    findMany: (options: { orderBy: { createdAt: 'desc' }; take: number; select: { id: boolean; to: boolean; subject: boolean; kind: boolean; createdAt: boolean } }) => Promise<Array<{ id: string; to: string; subject: string; kind: EmailKind; createdAt: Date }>>;
    findUnique: (options: { where: { id: string }; select: { id: boolean; to: boolean; subject: boolean; kind: boolean; html: boolean; createdAt: boolean } }) => Promise<{ id: string; to: string; subject: string; kind: EmailKind; html: string; createdAt: Date } | null>;
}

@Injectable()
export class AuthEmailService {
  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  private get previewModel(): EmailPreview {
    return (this.prisma as PrismaService & { emailPreview: EmailPreview }).emailPreview;
  }

  async send(input: SendEmailInput) {
    const sendRealEmail = String(this.config.get('SEND_REAL_EMAIL', 'false')).toLowerCase() === 'true';
    const zavuApiKey = this.config.get<string>('ZAVU_API_KEY');

    if (!sendRealEmail || !zavuApiKey) {
      await this.previewModel.create({
        data: {
          to: input.to,
          subject: input.subject,
          html: input.html,
          kind: input.kind,
        },
      });
      return { preview: true };
    }

    let ZavuCtor: any;
    try {
      // Optional runtime dependency: if package is not installed we gracefully fall back to preview mode.
      const mod = eval('require')('@zavudev/sdk');
      ZavuCtor = mod?.default ?? mod;
    } catch {
      await this.previewModel.create({
        data: {
          to: input.to,
          subject: input.subject,
          html: input.html,
          kind: input.kind,
        },
      });
      return { preview: true, reason: 'zavu-sdk-not-installed' };
    }

    const zavu = new ZavuCtor({ apiKey: zavuApiKey });
    await zavu.email.send({ to: input.to, subject: input.subject, html: input.html });

    return { preview: false };
  }

  async listPreviews(limit = 25) {
    return this.previewModel.findMany({
      orderBy: { createdAt: 'desc' },
      take: Math.min(Math.max(limit, 1), 100),
      select: {
        id: true,
        to: true,
        subject: true,
        kind: true,
        createdAt: true,
      },
    });
  }

  async getPreview(id: string) {
    return this.previewModel.findUnique({
      where: { id },
      select: {
        id: true,
        to: true,
        subject: true,
        kind: true,
        html: true,
        createdAt: true,
      },
    });
  }
}
