import { TasksService } from './tasks.service';

describe('Tasks workflow', () => {
  const prisma = {} as any;
  const events = {} as any;

  let service: TasksService;

  beforeEach(() => {
    service = new TasksService(prisma, events);
  });

  it('delegates updateStatus to update', async () => {
    const updateSpy = jest.spyOn(service, 'update').mockResolvedValue({ id: 'task-1', status: 'DONE' } as any);

    await service.updateStatus('task-1', { status: 'DONE' as any }, 'user-1');

    expect(updateSpy).toHaveBeenCalledWith('task-1', { status: 'DONE' }, 'user-1');
  });
});
