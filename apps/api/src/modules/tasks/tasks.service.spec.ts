import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { Role } from '@prisma/client';

import { TasksService } from './tasks.service';

describe('TasksService', () => {
  const prisma = {
    project: {
      findFirst: jest.fn(),
    },
    projectMember: {
      findUnique: jest.fn(),
    },
    subtask: {
      findMany: jest.fn(),
      update: jest.fn(),
    },
    activityLog: { create: jest.fn() },
    $transaction: jest.fn(),
    task: { findUniqueOrThrow: jest.fn() },
  } as any;

  const events = { emitTaskUpdated: jest.fn() } as any;
  const config = { get: jest.fn(() => 'http://localhost:3000') } as any;
  const email = { sendTaskAssignedEmail: jest.fn() } as any;
  const cacheManager = { remember: jest.fn() } as any;
  const cacheInvalidation = {
    invalidateTask: jest.fn(),
    invalidateProject: jest.fn(),
    invalidateDashboard: jest.fn(),
    invalidateNotifications: jest.fn(),
    invalidateUser: jest.fn(),
  } as any;
  const webhookDispatch = { dispatchEvent: jest.fn() } as any;

  let service: TasksService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new TasksService(prisma, events, config, email, cacheManager, cacheInvalidation, webhookDispatch);
    jest.spyOn(service as any, 'findOne').mockResolvedValue({ id: 'task-1', projectId: 'project-1' });
  });

  it('throws bad request for invalid subtask reorder payload', async () => {
    prisma.project.findFirst.mockResolvedValue({ id: 'project-1' });
    prisma.projectMember.findUnique.mockResolvedValue({ role: 'MEMBER' });
    prisma.subtask.findMany.mockResolvedValue([{ id: 'a' }, { id: 'b' }]);

    await expect(service.reorderSubtasks('task-1', ['a'], 'user-1')).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects write access when project role is VIEWER', async () => {
    prisma.project.findFirst.mockResolvedValue({ id: 'project-1' });
    prisma.projectMember.findUnique.mockResolvedValue({ role: 'VIEWER' });

    await expect(
      (service as any).assertProjectAccess('project-1', 'viewer-1', { requireWrite: true, userRole: Role.USER }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});
