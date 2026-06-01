import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

import { HealthService } from './health.service';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  @ApiOperation({ summary: 'Overall health summary (API + PostgreSQL + Redis)' })
  health() {
    return this.healthService.summary();
  }

  @Get('db')
  @ApiOperation({ summary: 'Database probe' })
  db() {
    return this.healthService.database();
  }

  @Get('realtime')
  @ApiOperation({ summary: 'Realtime/WebSocket probe' })
  realtime() {
    return this.healthService.realtime();
  }

  @Get('ws')
  @ApiOperation({ summary: 'WebSocket probe alias' })
  ws() {
    return this.healthService.realtime();
  }

  @Get('email')
  @ApiOperation({ summary: 'Email provider probe' })
  email() {
    return this.healthService.email();
  }

  @Get('live')
  @ApiOperation({ summary: 'Liveness probe' })
  live() {
    return this.healthService.live();
  }

  @Get('ready')
  @ApiOperation({ summary: 'Readiness probe (database + redis)' })
  ready() {
    return this.healthService.ready();
  }

  @Get('cache')
  @ApiOperation({ summary: 'Cache and Redis metrics' })
  cache() {
    return this.healthService.cache();
  }
}
