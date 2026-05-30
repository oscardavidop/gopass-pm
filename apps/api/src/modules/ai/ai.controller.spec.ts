import { AiController } from './ai.controller';

describe('AiController', () => {
  const aiService = {
    suggestPriority: jest.fn(),
  } as any;

  let controller: AiController;

  beforeEach(() => {
    jest.clearAllMocks();
    controller = new AiController(aiService);
  });

  it('calls suggestPriority with current user id', async () => {
    aiService.suggestPriority.mockResolvedValue({ priority: 'HIGH' });

    await controller.priority({ projectId: 'p1', title: 'Task', description: 'Desc' } as any, { id: 'u1' });

    expect(aiService.suggestPriority).toHaveBeenCalledWith(
      expect.objectContaining({ projectId: 'p1' }),
      'u1',
    );
  });
});
