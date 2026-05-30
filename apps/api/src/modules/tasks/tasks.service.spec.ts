import { BadRequestException } from '@nestjs/common';

import { TasksService } from './tasks.service';

describe('TasksService', () => {
  const prisma = {
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

  let service: TasksService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new TasksService(prisma, events, config, email);
    jest.spyOn(service as any, 'findOne').mockResolvedValue({ id: 'task-1', projectId: 'project-1' });
  });

  it('throws bad request for invalid subtask reorder payload', async () => {
    prisma.subtask.findMany.mockResolvedValue([{ id: 'a' }, { id: 'b' }]);

    await expect(service.reorderSubtasks('task-1', ['a'], 'user-1')).rejects.toBeInstanceOf(BadRequestException);
  });
});
