import { Controller, Get, UseGuards, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Min, Max } from 'class-validator';

import { DashboardService } from './dashboard.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('Dashboard')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('stats')
  @ApiOperation({ summary: 'Get summary KPIs' })
  getStats(@CurrentUser() user: any) {
    return this.dashboardService.getStats(user.id, user.role);
  }

  @Get('projects-overview')
  @ApiOperation({ summary: 'Get per-project progress overview' })
  getProjectsOverview(@CurrentUser() user: any) {
    return this.dashboardService.getProjectsOverview(user.id, user.role);
  }

  @Get('activity')
  @ApiOperation({ summary: 'Get recent activity feed' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  getRecentActivity(@CurrentUser() user: any, @Query('limit') limit?: number) {
    return this.dashboardService.getRecentActivity(user.id, user.role, limit ?? 20);
  }

  @Get('timeline')
  @ApiOperation({ summary: 'Get tasks created vs completed over last 30 days' })
  getTimeline(@CurrentUser() user: any) {
    return this.dashboardService.getTasksTimeline(user.id, user.role);
  }
}
