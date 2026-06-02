import { ForbiddenException } from '@nestjs/common';
import { Role } from '@prisma/client';

import { ProjectsService } from './projects.service';

describe('ProjectsService', () => {
  const prisma = {
    project: { update: jest.fn() },
  } as any;
  const events = {} as any;
  const config = {} as any;
  const email = {} as any;
  const cacheManager = { remember: jest.fn() } as any;
  const cacheInvalidation = { invalidateProject: jest.fn(), invalidateDashboard: jest.fn(), invalidateUser: jest.fn(), invalidateNotifications: jest.fn() } as any;
  const webhookDispatch = { dispatchEvent: jest.fn() } as any;
  const uploadsService = { deleteFilesForProjectTree: jest.fn() } as any;

  let service: ProjectsService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new ProjectsService(prisma, events, config, email, cacheManager, cacheInvalidation, webhookDispatch, uploadsService);
  });

  it('rejects delete when non-owner user is not admin', async () => {
    jest.spyOn(service, 'findOne').mockResolvedValue({
      ownerId: 'owner-1',
      members: [{ userId: 'member-1', role: 'ADMIN' }],
    } as any);

    await expect(service.remove('project-1', 'member-1', Role.USER)).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('rejects project update when caller is VIEWER', async () => {
    jest.spyOn(service, 'findOne').mockResolvedValue({
      id: 'project-1',
      members: [{ userId: 'viewer-1', role: 'VIEWER' }],
    } as any);

    await expect(service.update('project-1', {}, 'viewer-1', Role.USER)).rejects.toBeInstanceOf(ForbiddenException);
  });
});
