import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { CreateApiKeyDto } from './dto/create-api-key.dto';
import { CreateWebhookDto } from './dto/create-webhook.dto';
import { DevelopersService } from './developers.service';

@ApiTags('Developers')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('developers')
export class DevelopersController {
  constructor(private readonly developersService: DevelopersService) {}

  @Get('keys')
  @ApiOperation({ summary: 'List API keys for current user' })
  listApiKeys(@CurrentUser('id') userId: string) {
    return this.developersService.listApiKeys(userId);
  }

  @Post('keys')
  @ApiOperation({ summary: 'Create a new API key (secret shown only once)' })
  createApiKey(@CurrentUser() user: any, @Body() dto: CreateApiKeyDto) {
    this.ensureHumanSession(user);
    return this.developersService.createApiKey(user.id, dto);
  }

  @Delete('keys/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Revoke an API key' })
  revokeApiKey(@CurrentUser() user: any, @Param('id') id: string) {
    this.ensureHumanSession(user);
    return this.developersService.revokeApiKey(user.id, id);
  }

  @Get('usage/summary')
  @ApiOperation({ summary: 'Get API key usage summary' })
  usageSummary(@CurrentUser('id') userId: string) {
    return this.developersService.getUsageSummary(userId);
  }

  @Get('usage/requests')
  @ApiOperation({ summary: 'Get latest API requests from API key traffic' })
  recentUsage(@CurrentUser('id') userId: string, @Query('limit') limit?: string) {
    return this.developersService.getRecentUsage(userId, limit ? Number(limit) : 30);
  }

  @Get('limits')
  @ApiOperation({ summary: 'Get current API key limits' })
  getLimits(@Req() req: Request) {
    return {
      rateLimitPerHour: Number(process.env.API_KEY_RATE_LIMIT_PER_HOUR || 1000),
      usageHeader: req.headers['x-api-key'] ? 'X-API-Key' : 'Authorization: ApiKey',
    };
  }

  @Get('docs')
  @ApiOperation({ summary: 'Developer docs payload for portal UI' })
  docs(@Req() req: Request) {
    const host = req.get('host') || 'localhost:3000';
    const protocol = req.protocol || 'http';
    return this.developersService.getDocs(`${protocol}://${host}/api/v1`);
  }

  @Get('webhooks')
  @ApiOperation({ summary: 'List webhooks' })
  listWebhooks(@CurrentUser('id') userId: string) {
    return this.developersService.listWebhooks(userId);
  }

  @Post('webhooks')
  @ApiOperation({ summary: 'Create webhook (foundation)' })
  createWebhook(@CurrentUser() user: any, @Body() dto: CreateWebhookDto) {
    this.ensureHumanSession(user);
    return this.developersService.createWebhook(user.id, dto);
  }

  @Delete('webhooks/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Disable webhook (foundation)' })
  disableWebhook(@CurrentUser() user: any, @Param('id') id: string) {
    this.ensureHumanSession(user);
    return this.developersService.disableWebhook(user.id, id);
  }

  private ensureHumanSession(user: any) {
    if (user?.authType === 'api_key') {
      throw new ForbiddenException('API key sessions cannot manage developer credentials');
    }
  }
}
