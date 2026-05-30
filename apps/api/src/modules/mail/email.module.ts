import { Module } from '@nestjs/common';

import { PrismaModule } from '../../shared/database/prisma.module';
import { EMAIL_PROVIDER_TOKEN } from './email.registry';
import { ZavuProvider } from './email.providers/zavu.provider';
import { EmailService } from './email.service';

@Module({
  imports: [PrismaModule],
  providers: [
    EmailService,
    ZavuProvider,
    {
      provide: EMAIL_PROVIDER_TOKEN,
      useExisting: ZavuProvider,
    },
  ],
  exports: [EmailService],
})
export class EmailModule {}
