import { TasksService } from './tasks.service';
import { Role } from '@prisma/client';

describe('Tasks workflow', () => {
  const prisma = {} as any;
  const events = {} as any;
  const config = { get: jest.fn(() => 'http://localhost:3000') } as any;
  const email = { sendTaskAssignedEmail: jest.fn() } as any;
  const cacheManager = { remember: jest.fn() } as any;
  const cacheInvalidation = { invalidateTask: jest.fn(), invalidateProject: jest.fn(), invalidateDashboard: jest.fn() } as any;
  const webhookDispatch = { dispatchEvent: jest.fn() } as any;

  let service: TasksService;

  beforeEach(() => {
    service = new TasksService(prisma, events, config, email, cacheManager, cacheInvalidation, webhookDispatch);
  });

  it('delegates updateStatus to update', async () => {
    const updateSpy = jest.spyOn(service, 'update').mockResolvedValue({ id: 'task-1', status: 'DONE' } as any);

    await service.updateStatus('task-1', { status: 'DONE' as any }, 'user-1');

    expect(updateSpy).toHaveBeenCalledWith('task-1', { status: 'DONE' }, 'user-1', Role.USER);
  });
});
