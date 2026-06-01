import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { ApiKeyStatus } from '@prisma/client';
import { Request } from 'express';
import { createHash } from 'crypto';

import { PrismaService } from '../../../shared/database/prisma.service';
import { CacheService } from '../../../shared/redis/cache.service';
import { CacheKeys } from '../../../shared/redis/cache-keys';
import { RedisService } from '../../../shared/redis/redis.service';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
    private readonly cacheService: CacheService,
    private readonly redisService: RedisService,
  ) {}

  async canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<Request & { user?: any; auth?: any }>();

    const apiKey = this.extractApiKey(request);
    if (apiKey) {
      return this.handleApiKeyAuth(request, apiKey);
    }

    const bearer = this.extractBearerToken(request);
    if (!bearer) {
      throw new UnauthorizedException('Missing authorization token');
    }

    // Backward-compatible support: if a key is sent as Bearer, fallback to API key auth.
    if (bearer.startsWith('tasku_')) {
      return this.handleApiKeyAuth(request, bearer);
    }

    try {
      const payload = await this.jwtService.verifyAsync(bearer, {
        secret: this.config.get<string>('JWT_ACCESS_SECRET'),
      });

      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          avatar: true,
          role: true,
          emailVerifiedAt: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      if (!user) {
        throw new UnauthorizedException('Invalid token user');
      }

      request.user = {
        ...user,
        authType: 'jwt',
      };

      return true;
    } catch {
      throw new UnauthorizedException('Invalid or expired token');
    }
  }

  private async handleApiKeyAuth(request: Request & { user?: any; auth?: any }, rawKey: string) {
    const prefix = rawKey.slice(0, 18);
    const digest = createHash('sha256').update(rawKey).digest('hex');

    const cachedKey = await this.cacheService.get<any>(CacheKeys.apiKey(digest));
    const key = cachedKey ?? await this.prisma.apiKey.findFirst({
      where: {
        keyPrefix: prefix,
        status: ApiKeyStatus.ACTIVE,
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            avatar: true,
            role: true,
            emailVerifiedAt: true,
            createdAt: true,
            updatedAt: true,
          },
        },
      },
    });

    if (!key || key.hashedSecret !== digest) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!cachedKey) {
      await this.cacheService.set(CacheKeys.apiKey(digest), key, 300);
    }

    if (key.expiresAt && key.expiresAt <= new Date()) {
      await this.prisma.apiKey.update({
        where: { id: key.id },
        data: { status: ApiKeyStatus.EXPIRED },
      });
      throw new UnauthorizedException('API key expired');
    }

    const requiredScope = this.resolveScope(request.method, request.path);
    if (requiredScope && !this.hasScope(key.scopes, requiredScope)) {
      throw new UnauthorizedException(`Missing scope: ${requiredScope}`);
    }

    const maxPerHour = Number(this.config.get<string>('API_KEY_RATE_LIMIT_PER_HOUR', '1000'));
    const currentHourCount = await this.resolveApiKeyWindowCount(key.id);
    if (currentHourCount > maxPerHour) {
      throw new HttpException('API key rate limit exceeded', HttpStatus.TOO_MANY_REQUESTS);
    }

    request.auth = {
      type: 'api_key',
      apiKeyId: key.id,
      keyPrefix: key.keyPrefix,
      scopes: key.scopes,
    };

    request.user = {
      ...key.user,
      authType: 'api_key',
      apiKeyId: key.id,
      apiKeyPrefix: key.keyPrefix,
      scopes: key.scopes,
    };

    return true;
  }

  private extractBearerToken(req: Request) {
    const authorization = req.headers.authorization;
    if (!authorization) return null;

    const [scheme, token] = authorization.split(' ');
    if (scheme?.toLowerCase() !== 'bearer' || !token) return null;
    return token.trim();
  }

  private extractApiKey(req: Request) {
    const directKey = req.header('x-api-key');
    if (directKey) return directKey.trim();

    const authorization = req.headers.authorization;
    if (!authorization) return null;
    const [scheme, token] = authorization.split(' ');
    if (scheme?.toLowerCase() !== 'apikey' || !token) return null;
    return token.trim();
  }

  private hasScope(scopes: string[], requiredScope: string) {
    if (!requiredScope) return true;
    if (scopes.includes('*')) return true;
    return scopes.includes(requiredScope);
  }

  private resolveScope(method: string, path: string) {
    const m = method.toUpperCase();
    const p = path.toLowerCase();

    if (p.startsWith('/api/v1/projects') || p.startsWith('/projects')) {
      return m === 'GET' ? 'projects:read' : 'projects:write';
    }

    if (p.startsWith('/api/v1/tasks') || p.startsWith('/tasks')) {
      return m === 'GET' ? 'tasks:read' : 'tasks:write';
    }

    if (p.startsWith('/api/v1/uploads') || p.startsWith('/uploads') || p.startsWith('/api/v1/files') || p.startsWith('/files')) {
      return m === 'GET' ? 'files:read' : 'files:write';
    }

    if (p.startsWith('/api/v1/notifications') || p.startsWith('/notifications')) {
      return 'notifications:read';
    }

    return undefined;
  }

  private async resolveApiKeyWindowCount(apiKeyId: string) {
    try {
      const client = this.redisService.getClient();
      if (client.status === 'wait') await client.connect();

      const bucket = Math.floor(Date.now() / (60 * 60 * 1000));
      const key = `ratelimit:apikey:${apiKeyId}:${bucket}`;
      const count = await client.incr(key);
      if (count === 1) {
        await client.expire(key, 60 * 60);
      }
      return count;
    } catch {
      return this.prisma.apiKeyUsage.count({
        where: {
          apiKeyId,
          createdAt: { gte: new Date(Date.now() - 60 * 60 * 1000) },
        },
      });
    }
  }
}
