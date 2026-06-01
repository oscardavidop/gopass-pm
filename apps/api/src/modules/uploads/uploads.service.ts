import {
  BadRequestException,
  ForbiddenException,
  Inject,
  InternalServerErrorException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { FileEntityType, Role } from '@prisma/client';
import { randomUUID, createHmac, timingSafeEqual } from 'crypto';
import { extname } from 'path';

import { PrismaService } from '../../shared/database/prisma.service';
import { hasProjectPermission } from '../auth/authorization/project-rbac';
import { STORAGE_PROVIDER, StorageProvider } from './storage/storage.provider';

interface UploadIncomingFile {
  buffer: Buffer;
  originalname: string;
  mimetype: string;
  size: number;
}

const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain',
  'text/csv',
]);

const DANGEROUS_EXTENSIONS = new Set([
  '.exe', '.bat', '.cmd', '.sh', '.ps1', '.js', '.mjs', '.cjs', '.jar', '.msi', '.vbs', '.scr',
]);

@Injectable()
export class UploadsService {
  private readonly logger = new Logger(UploadsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    @Inject(STORAGE_PROVIDER)
    private readonly storage: StorageProvider,
  ) {}

  async upload(
    input: {
      file: UploadIncomingFile;
      entityType: FileEntityType;
      entityId: string;
      kind?: string;
    },
    user: { id: string; role: Role },
  ) {
    this.validateFile(input.file);

    const access = await this.assertEntityAccess(input.entityType, input.entityId, user.id, user.role, true);
    await this.scanForThreats(input.file);

    const safeName = this.sanitizeFilename(input.file.originalname);
    const extension = extname(safeName).toLowerCase();
    const key = [
      input.entityType.toLowerCase(),
      input.entityId,
      new Date().getUTCFullYear().toString(),
      `${new Date().getUTCMonth() + 1}`.padStart(2, '0'),
      `${Date.now()}-${randomUUID()}${extension}`,
    ].join('/');

    await this.storage.upload(input.file.buffer, key, input.file.mimetype);

    const record = await this.prisma.file.create({
      data: {
        path: key,
        url: this.buildApiFileUrlPlaceholder(),
        filename: safeName,
        mimeType: input.file.mimetype,
        size: input.file.size,
        uploadedBy: user.id,
        entityType: input.entityType,
        entityId: input.entityId,
        kind: (input.kind || 'attachment').slice(0, 40),
      },
    });

    const canonicalUrl = this.buildApiFileUrl(record.id);
    const updated = await this.prisma.file.update({
      where: { id: record.id },
      data: { url: canonicalUrl },
    });

    if (input.entityType === FileEntityType.USER && (input.kind || '').toLowerCase() === 'avatar') {
      const signedAvatarUrl = this.buildSignedFileUrl(updated.id, 60 * 60 * 24 * 30);
      await this.prisma.user.update({ where: { id: input.entityId }, data: { avatar: signedAvatarUrl } });
    }

    await this.prisma.activityLog.create({
      data: {
        action: 'FILE_UPLOADED',
        entity: 'File',
        entityId: updated.id,
        newValue: {
          filename: updated.filename,
          mimeType: updated.mimeType,
          size: updated.size,
          entityType: updated.entityType,
          entityId: updated.entityId,
          kind: updated.kind,
        },
        userId: user.id,
        projectId: access.projectId,
        taskId: access.taskId,
      },
    });

    return {
      ...updated,
      signedUrl: this.buildSignedFileUrl(updated.id, 60 * 60 * 24 * 7),
    };
  }

  async listByEntity(
    entityType: FileEntityType,
    entityId: string,
    user: { id: string; role: Role },
  ) {
    await this.assertEntityAccess(entityType, entityId, user.id, user.role, false);

    const files = await this.prisma.file.findMany({
      where: { entityType, entityId },
      orderBy: { createdAt: 'desc' },
    });

    return files.map((file) => ({
      ...file,
      signedUrl: this.buildSignedFileUrl(file.id, 60 * 60 * 24),
    }));
  }

  async delete(fileId: string, user: { id: string; role: Role }) {
    const file = await this.prisma.file.findUnique({ where: { id: fileId } });
    if (!file) throw new NotFoundException({ i18nKey: 'uploads.fileNotFound' });

    const access = await this.assertEntityAccess(file.entityType, file.entityId, user.id, user.role, true);

    const canDeleteOwn = file.uploadedBy === user.id;
    if (!canDeleteOwn && user.role !== Role.ADMIN && !access.canManageEntity) {
      throw new ForbiddenException({ i18nKey: 'uploads.permissionDenied' });
    }

    await this.storage.delete(file.path);

    await this.prisma.file.delete({ where: { id: file.id } });

    if (file.entityType === FileEntityType.USER && (file.kind || '').toLowerCase() === 'avatar') {
      const owner = await this.prisma.user.findUnique({ where: { id: file.entityId }, select: { avatar: true } });
      if (owner?.avatar === file.url) {
        await this.prisma.user.update({ where: { id: file.entityId }, data: { avatar: null } });
      }
    }

    await this.prisma.activityLog.create({
      data: {
        action: 'FILE_DELETED',
        entity: 'File',
        entityId: file.id,
        oldValue: {
          filename: file.filename,
          mimeType: file.mimeType,
          size: file.size,
          path: file.path,
          entityType: file.entityType,
          entityId: file.entityId,
          kind: file.kind,
        },
        userId: user.id,
        projectId: access.projectId,
        taskId: access.taskId,
      },
    });

    return { id: fileId, deleted: true };
  }

  async getFileStream(fileId: string, sig?: string, exp?: string) {
    if (!this.isSignatureValid(fileId, sig, exp)) {
      await this.logFileAccessFailure(fileId, 'invalid_signature');
      throw new ForbiddenException({ i18nKey: 'uploads.invalidSignedUrl' });
    }

    const file = await this.prisma.file.findUnique({ where: { id: fileId } });
    if (!file) throw new NotFoundException({ i18nKey: 'uploads.fileNotFound' });

    const object = await this.storage.getObject(file.path);

    return {
      file,
      stream: object.stream,
      contentType: object.contentType || file.mimeType,
      contentLength: object.contentLength || file.size,
    };
  }

  private validateFile(file: UploadIncomingFile) {
    if (!file) {
      throw new BadRequestException({ i18nKey: 'uploads.fileRequired' });
    }

    const maxSizeMb = this.config.get<number>('UPLOADS_MAX_FILE_SIZE_MB', 25);
    const maxBytes = maxSizeMb * 1024 * 1024;
    if (file.size > maxBytes) {
      throw new BadRequestException({
        i18nKey: 'uploads.maxSizeExceeded',
        i18nParams: { maxSizeMb },
      });
    }

    const ext = extname(file.originalname || '').toLowerCase();
    if (DANGEROUS_EXTENSIONS.has(ext)) {
      throw new BadRequestException({ i18nKey: 'uploads.invalidFileType' });
    }

    if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
      throw new BadRequestException({ i18nKey: 'uploads.invalidMimeType' });
    }
  }

  private sanitizeFilename(name: string) {
    const base = name.split('/').pop()?.split('\\').pop() || 'file';
    return base
      .trim()
      .replace(/\s+/g, '-')
      .replace(/[^a-zA-Z0-9._-]/g, '')
      .slice(0, 120);
  }

  private async scanForThreats(file: UploadIncomingFile) {
    // Future-ready antivirus hook.
    const enabled = this.config.get<string>('UPLOADS_ANTIVIRUS_ENABLED', 'false') === 'true';
    if (!enabled) return;

    // Placeholder for external scanner integration.
    if (!file.buffer || file.buffer.length === 0) {
      throw new BadRequestException({ i18nKey: 'uploads.invalidFileType' });
    }
  }

  private buildApiFileUrl(fileId: string) {
    const prefix = this.config.get<string>('API_PREFIX', 'api/v1').replace(/^\/+|\/+$/g, '');
    return `/${prefix}/files/${fileId}`;
  }

  private buildApiFileUrlPlaceholder() {
    return '/api/v1/files/pending';
  }

  private buildSignedFileUrl(fileId: string, ttlSeconds: number) {
    const exp = Math.floor(Date.now() / 1000) + ttlSeconds;
    const sig = this.sign(fileId, exp);
    return `${this.buildApiFileUrl(fileId)}?exp=${exp}&sig=${sig}`;
  }

  private sign(fileId: string, exp: number) {
    const secret = this.config.get<string>('UPLOADS_SIGNING_SECRET') || this.config.get<string>('JWT_ACCESS_SECRET');
    if (!secret || secret.includes('change_me') || secret === 'change-me') {
      throw new InternalServerErrorException('File signing secret is not configured');
    }
    return createHmac('sha256', secret).update(`${fileId}:${exp}`).digest('hex');
  }

  private isSignatureValid(fileId: string, sig?: string, exp?: string) {
    if (!sig || !exp) return false;
    const expiry = Number(exp);
    if (!Number.isFinite(expiry)) return false;
    if (expiry < Math.floor(Date.now() / 1000)) return false;

    const expected = this.sign(fileId, expiry);
    const expectedBuffer = Buffer.from(expected);
    const receivedBuffer = Buffer.from(sig);
    if (expectedBuffer.length !== receivedBuffer.length) return false;

    return timingSafeEqual(expectedBuffer, receivedBuffer);
  }

  private async logFileAccessFailure(fileId: string, reason: string) {
    this.logger.warn(`File access denied for ${fileId}: ${reason}`);
  }

  private async assertEntityAccess(
    entityType: FileEntityType,
    entityId: string,
    userId: string,
    userRole: Role,
    requireWrite: boolean,
  ): Promise<{ projectId?: string; taskId?: string; canManageEntity: boolean }> {
    if (entityType === FileEntityType.USER) {
      const target = await this.prisma.user.findFirst({ where: { id: entityId, deletedAt: null }, select: { id: true } });
      if (!target) throw new NotFoundException({ i18nKey: 'uploads.entityNotFound' });
      const isOwner = userId === entityId;
      if (!isOwner && userRole !== Role.ADMIN) throw new ForbiddenException({ i18nKey: 'uploads.permissionDenied' });
      return { canManageEntity: isOwner || userRole === Role.ADMIN };
    }

    if (entityType === FileEntityType.PROJECT) {
      const project = await this.prisma.project.findFirst({ where: { id: entityId, deletedAt: null }, select: { id: true } });
      if (!project) throw new NotFoundException({ i18nKey: 'uploads.entityNotFound' });
      const membership = await this.assertProjectAccess(project.id, userId, userRole, requireWrite, 'project.update');
      return { projectId: project.id, canManageEntity: membership.canManage };
    }

    if (entityType === FileEntityType.TASK) {
      const task = await this.prisma.task.findFirst({
        where: { id: entityId, deletedAt: null },
        select: { id: true, projectId: true },
      });
      if (!task) throw new NotFoundException({ i18nKey: 'uploads.entityNotFound' });
      const membership = await this.assertProjectAccess(task.projectId, userId, userRole, requireWrite, 'task.write');
      return { projectId: task.projectId, taskId: task.id, canManageEntity: membership.canManage };
    }

    const comment = await this.prisma.comment.findFirst({
      where: { id: entityId, deletedAt: null },
      select: { id: true, task: { select: { id: true, projectId: true } } },
    });

    if (!comment) throw new NotFoundException({ i18nKey: 'uploads.entityNotFound' });
    const membership = await this.assertProjectAccess(comment.task.projectId, userId, userRole, requireWrite, 'task.write');
    return {
      projectId: comment.task.projectId,
      taskId: comment.task.id,
      canManageEntity: membership.canManage,
    };
  }

  private async assertProjectAccess(
    projectId: string,
    userId: string,
    userRole: Role,
    requireWrite: boolean,
    writeCapability: 'task.write' | 'project.update',
  ) {
    if (userRole === Role.ADMIN) return { canManage: true };

    const member = await this.prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId, userId } },
      select: { role: true },
    });

    if (!member || !hasProjectPermission(member.role, 'project.read', userRole)) {
      throw new ForbiddenException({ i18nKey: 'uploads.permissionDenied' });
    }

    if (requireWrite && !hasProjectPermission(member.role, writeCapability, userRole)) {
      throw new ForbiddenException({ i18nKey: 'uploads.permissionDenied' });
    }

    return { canManage: hasProjectPermission(member.role, writeCapability, userRole) };
  }
}
