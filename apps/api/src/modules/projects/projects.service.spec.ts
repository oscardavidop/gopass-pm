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

  let service: ProjectsService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new ProjectsService(prisma, events, config, email);
  });

  it('rejects delete when non-owner user is not admin', async () => {
    jest.spyOn(service, 'findOne').mockResolvedValue({ ownerId: 'owner-1' } as any);

    await expect(service.remove('project-1', 'member-1', Role.USER)).rejects.toBeInstanceOf(ForbiddenException);
  });
});
