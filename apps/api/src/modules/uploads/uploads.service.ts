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
import { FileEntityType, FileProvider, FileVisibility, Role } from '@prisma/client';
import { createHash, createHmac, randomUUID, timingSafeEqual } from 'crypto';
import { extname } from 'path';
import { fileTypeFromBuffer } from 'file-type';
import isSvg from 'is-svg';
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
  'image/svg+xml',
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

const PUBLIC_FILE_KINDS = new Set([
  'avatar',
  'icon',
  'cover',
  'banner',
  'logo',
  'landing',
  'landing-asset',
  'project-icon',
  'project-cover',
  'project-banner',
]);

const SINGLETON_KINDS = new Set(['avatar', 'icon', 'cover', 'banner', 'logo', 'project-icon', 'project-cover', 'project-banner']);

@Injectable()
export class UploadsService {
  private readonly logger = new Logger(UploadsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    @Inject(STORAGE_PROVIDER)
    private readonly storage: StorageProvider,
  ) { }

  async upload(
    input: {
      file: UploadIncomingFile;
      entityType: FileEntityType;
      entityId: string;
      kind?: string;
    },
    user: { id: string; role: Role },
  ) {
    const kind = this.normalizeKind(input.kind);
    const visibility = this.resolveVisibility(input.entityType, kind);

    const normalized = this.normalizeIncomingFile(input.file);
    this.validateFile(normalized.file, normalized.safeName);

    const access = await this.assertEntityAccess(input.entityType, input.entityId, user.id, user.role, true);
    await this.scanForThreats(normalized.file);

    const safeName = normalized.safeName;
    const extension = extname(safeName).toLowerCase();
    const key = [
      visibility === FileVisibility.PUBLIC ? 'public' : 'private',
      input.entityType.toLowerCase(),
      input.entityId,
      new Date().getUTCFullYear().toString(),
      `${new Date().getUTCMonth() + 1}`.padStart(2, '0'),
      `${Date.now()}-${randomUUID()}${extension}`,
    ].join('/');

    const fileId = randomUUID();
    const checksum = createHash('sha256').update(normalized.file.buffer).digest('hex');
    const cacheControl = visibility === FileVisibility.PUBLIC
      ? 'public, max-age=31536000, immutable'
      : 'private, max-age=0, no-cache';

    const uploaded = await this.storage.upload({
      key,
      file: normalized.file.buffer,
      mimeType: normalized.file.mimetype,
      visibility,
      cacheControl,
      contentDisposition: this.buildContentDisposition(safeName, normalized.file.mimetype, visibility),
    });

    const publicUrl = visibility === FileVisibility.PUBLIC ? this.storage.getPublicUrl(key) : null;
    const canonicalUrl = visibility === FileVisibility.PUBLIC ? publicUrl! : this.buildApiFileUrl(fileId);

    const record = await this.prisma.file.create({
      data: {
        id: fileId,
        path: key,
        storageKey: key,
        bucket: uploaded.bucket || this.storage.getBucketName(),
        url: canonicalUrl,
        publicUrl,
        filename: safeName,
        originalName: input.file.originalname,
        mimeType: normalized.file.mimetype,
        size: normalized.file.size,
        visibility,
        provider: this.resolveProvider(),
        etag: uploaded.etag,
        checksum,
        uploadedBy: user.id,
        entityType: input.entityType,
        entityId: input.entityId,
        kind,
      },
    });

    const signedUrl = visibility === FileVisibility.PRIVATE
      ? await this.storage.getSignedUrl(key, this.getSignedUrlTtlSeconds())
      : undefined;

    if (input.entityType === FileEntityType.USER && kind === 'avatar') {
      await this.prisma.user.update({
        where: { id: input.entityId },
        data: { avatar: publicUrl ?? signedUrl ?? canonicalUrl },
      });
    }

    if (this.shouldReplacePrevious(input.entityType, kind)) {
      await this.cleanupPreviousFiles({
        entityType: input.entityType,
        entityId: input.entityId,
        kind,
        keepFileId: record.id,
      });
    }

    await this.prisma.activityLog.create({
      data: {
        action: 'FILE_UPLOADED',
        entity: 'File',
        entityId: record.id,
        newValue: {
          filename: record.filename,
          mimeType: record.mimeType,
          size: record.size,
          entityType: record.entityType,
          entityId: record.entityId,
          kind: record.kind,
          visibility: record.visibility,
          provider: record.provider,
          storageKey: record.storageKey,
        },
        userId: user.id,
        projectId: access.projectId,
        taskId: access.taskId,
      },
    });

    return {
      ...record,
      signedUrl,
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

    const mapped = await Promise.all(files.map(async (file) => {
      const key = this.getStorageKey(file);
      const signedUrl = file.visibility === FileVisibility.PRIVATE
        ? await this.storage.getSignedUrl(key, this.getSignedUrlTtlSeconds())
        : undefined;
      const url = file.visibility === FileVisibility.PUBLIC
        ? (file.publicUrl || this.storage.getPublicUrl(key))
        : file.url;

      return {
        ...file,
        url,
        publicUrl: file.visibility === FileVisibility.PUBLIC ? url : file.publicUrl,
        signedUrl,
      };
    }));

    return mapped;
  }

  async delete(fileId: string, user: { id: string; role: Role }) {
    const file = await this.prisma.file.findUnique({ where: { id: fileId } });
    if (!file) throw new NotFoundException({ i18nKey: 'uploads.fileNotFound' });

    const access = await this.assertEntityAccess(file.entityType, file.entityId, user.id, user.role, true);

    const canDeleteOwn = file.uploadedBy === user.id;
    if (!canDeleteOwn && user.role !== Role.ADMIN && !access.canManageEntity) {
      throw new ForbiddenException({ i18nKey: 'uploads.permissionDenied' });
    }

    await this.deleteFileRecord(file.id);

    if (file.entityType === FileEntityType.USER && this.normalizeKind(file.kind) === 'avatar') {
      const owner = await this.prisma.user.findUnique({ where: { id: file.entityId }, select: { avatar: true } });
      if (owner?.avatar && [file.url, file.publicUrl].filter(Boolean).includes(owner.avatar)) {
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
          storageKey: this.getStorageKey(file),
          entityType: file.entityType,
          entityId: file.entityId,
          kind: file.kind,
          visibility: file.visibility,
          provider: file.provider,
        },
        userId: user.id,
        projectId: access.projectId,
        taskId: access.taskId,
      },
    });

    return { id: fileId, deleted: true };
  }

  async deleteFilesForEntity(entityType: FileEntityType, entityId: string) {
    const files = await this.prisma.file.findMany({
      where: { entityType, entityId },
      select: { id: true },
    });

    for (const file of files) {
      await this.deleteFileRecord(file.id);
    }

    return { deleted: files.length };
  }

  async deleteFilesForTaskTree(taskId: string) {
    const commentIds = await this.prisma.comment.findMany({
      where: { taskId },
      select: { id: true },
    });
    const commentIdSet = commentIds.map((item) => item.id);

    const files = await this.prisma.file.findMany({
      where: {
        OR: [
          { entityType: FileEntityType.TASK, entityId: taskId },
          ...(commentIdSet.length > 0
            ? [{ entityType: FileEntityType.COMMENT, entityId: { in: commentIdSet } }]
            : []),
        ],
      },
      select: { id: true },
    });

    for (const file of files) {
      await this.deleteFileRecord(file.id);
    }

    return { deleted: files.length };
  }

  async deleteFilesForProjectTree(projectId: string) {
    const taskIds = await this.prisma.task.findMany({
      where: { projectId },
      select: { id: true },
    });
    const taskIdSet = taskIds.map((item) => item.id);
    const commentIds = taskIdSet.length
      ? await this.prisma.comment.findMany({
        where: { taskId: { in: taskIdSet } },
        select: { id: true },
      })
      : [];
    const commentIdSet = commentIds.map((item) => item.id);

    const files = await this.prisma.file.findMany({
      where: {
        OR: [
          { entityType: FileEntityType.PROJECT, entityId: projectId },
          ...(taskIdSet.length > 0
            ? [{ entityType: FileEntityType.TASK, entityId: { in: taskIdSet } }]
            : []),
          ...(commentIdSet.length > 0
            ? [{ entityType: FileEntityType.COMMENT, entityId: { in: commentIdSet } }]
            : []),
        ],
      },
      select: { id: true },
    });

    for (const file of files) {
      await this.deleteFileRecord(file.id);
    }

    return { deleted: files.length };
  }

  async getFileStream(fileId: string, sig?: string, exp?: string) {
    if (!this.isSignatureValid(fileId, sig, exp)) {
      await this.logFileAccessFailure(fileId, 'invalid_signature');
      throw new ForbiddenException({ i18nKey: 'uploads.invalidSignedUrl' });
    }

    const file = await this.prisma.file.findUnique({ where: { id: fileId } });
    if (!file) throw new NotFoundException({ i18nKey: 'uploads.fileNotFound' });

    const object = await this.storage.getObject(this.getStorageKey(file));

    return {
      file,
      stream: object.stream,
      contentType: object.contentType || file.mimeType,
      contentLength: object.contentLength || file.size,
    };
  }

  private validateFile(file: UploadIncomingFile, safeName: string) {
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

    const ext = extname(safeName || '').toLowerCase();
    if (DANGEROUS_EXTENSIONS.has(ext)) {
      throw new BadRequestException({ i18nKey: 'uploads.invalidFileType' });
    }

    if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
      throw new BadRequestException({ i18nKey: 'uploads.invalidMimeType' });
    }

    this.validateMagicBytes(file);
  }

  private normalizeIncomingFile(file: UploadIncomingFile) {
    const safeName = this.sanitizeFilename(file.originalname);

    if (file.mimetype !== 'image/svg+xml') {
      return { file, safeName };
    }

    const svgText = file.buffer.toString('utf8');
    const sanitized = this.sanitizeSvg(svgText);
    const next = Buffer.from(sanitized, 'utf8');

    return {
      safeName,
      file: {
        ...file,
        buffer: next,
        size: next.byteLength,
      },
    };
  }

  private async validateMagicBytes(file: UploadIncomingFile): Promise<void> {
    // 1. Corregido: Convertir el buffer a string para 'is-svg'
    if (file.mimetype === 'image/svg+xml') {
      const svgString = file.buffer.toString('utf8');
      if (!isSvg(svgString)) {
        throw new BadRequestException({ i18nKey: 'uploads.invalidMimeType' });
      }
      return;
    }

    const detectedType = await fileTypeFromBuffer(file.buffer);

    if (!detectedType) {
      throw new BadRequestException({ i18nKey: 'uploads.invalidFileType' });
    }

    const allowedTypes = [
      { ext: 'jpg', mime: 'image/jpeg' },
      { ext: 'jpeg', mime: 'image/jpeg' },
      { ext: 'png', mime: 'image/png' },
      { ext: 'webp', mime: 'image/webp' },
      { ext: 'pdf', mime: 'application/pdf' } // Corregido string faltante aquí también
    ];

    const isValid = allowedTypes.some(
      type => type.ext === detectedType.ext && type.mime === detectedType.mime
    );

    if (!isValid) {
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

  private sanitizeSvg(content: string) {
    const withoutScript = content.replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '');
    const withoutHandlers = withoutScript.replace(/\son[a-z]+=\"[^\"]*\"/gi, '').replace(/\son[a-z]+=\'[^\']*\'/gi, '');
    const withoutForeignObject = withoutHandlers.replace(/<foreignObject[\s\S]*?>[\s\S]*?<\/foreignObject>/gi, '');
    return withoutForeignObject;
  }

  private async scanForThreats(file: UploadIncomingFile) {
    const enabled = this.config.get<string>('UPLOADS_ANTIVIRUS_ENABLED', 'false') === 'true';
    if (!enabled) return;

    if (!file.buffer || file.buffer.length === 0) {
      throw new BadRequestException({ i18nKey: 'uploads.invalidFileType' });
    }
  }

  private buildApiFileUrl(fileId: string) {
    const prefix = this.config.get<string>('API_PREFIX', 'api/v1').replace(/^\/+|\/+$/g, '');
    return `/${prefix}/files/${fileId}`;
  }

  private buildContentDisposition(filename: string, mimeType: string, visibility: FileVisibility) {
    const inlineTypes = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml', 'application/pdf']);
    const dispositionType = visibility === FileVisibility.PUBLIC && inlineTypes.has(mimeType) ? 'inline' : 'attachment';
    const safe = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
    return `${dispositionType}; filename="${safe}"`;
  }

  private normalizeKind(kind?: string | null) {
    return (kind || 'attachment').trim().toLowerCase().slice(0, 40);
  }

  private resolveVisibility(entityType: FileEntityType, kind: string): FileVisibility {
    if (entityType === FileEntityType.USER && kind === 'avatar') return FileVisibility.PUBLIC;
    if (entityType === FileEntityType.PROJECT && PUBLIC_FILE_KINDS.has(kind)) return FileVisibility.PUBLIC;
    return PUBLIC_FILE_KINDS.has(kind) ? FileVisibility.PUBLIC : FileVisibility.PRIVATE;
  }

  private shouldReplacePrevious(entityType: FileEntityType, kind: string) {
    if (entityType === FileEntityType.USER && kind === 'avatar') return true;
    return entityType === FileEntityType.PROJECT && SINGLETON_KINDS.has(kind);
  }

  private resolveProvider(): FileProvider {
    const provider = this.config.get<string>('UPLOADS_PROVIDER', 's3').toUpperCase();
    if (provider === 'LOCAL') return FileProvider.LOCAL;
    if (provider === 'R2') return FileProvider.R2;
    if (provider === 'MINIO') return FileProvider.MINIO;
    if (provider === 'AZURE') return FileProvider.AZURE;
    return FileProvider.S3;
  }

  private getSignedUrlTtlSeconds() {
    return Number(this.config.get<string>('UPLOADS_SIGNED_URL_TTL_SECONDS', '900'));
  }

  private getStorageKey(file: { storageKey?: string | null; path?: string | null }) {
    return file.storageKey || file.path || '';
  }

  private async cleanupPreviousFiles(input: {
    entityType: FileEntityType;
    entityId: string;
    kind: string;
    keepFileId: string;
  }) {
    const older = await this.prisma.file.findMany({
      where: {
        entityType: input.entityType,
        entityId: input.entityId,
        kind: input.kind,
        id: { not: input.keepFileId },
      },
      select: { id: true },
    });

    for (const file of older) {
      await this.deleteFileRecord(file.id);
    }
  }

  private async deleteFileRecord(fileId: string) {
    const file = await this.prisma.file.findUnique({ where: { id: fileId } });
    if (!file) return;

    const key = this.getStorageKey(file);
    if (key) {
      await this.storage.delete(key).catch((error) => {
        const msg = error instanceof Error ? error.message : String(error);
        this.logger.warn(`Failed to delete storage object ${key}: ${msg}`);
      });
    }

    await this.prisma.file.delete({ where: { id: file.id } });
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
