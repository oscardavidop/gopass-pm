import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, catchError, tap, throwError } from 'rxjs';
import { Request, Response } from 'express';

import { DevelopersService } from '../developers.service';

@Injectable()
export class ApiKeyUsageInterceptor implements NestInterceptor {
  constructor(private readonly developersService: DevelopersService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest<Request & { auth?: any }>();
    const response = context.switchToHttp().getResponse<Response>();

    const auth = request.auth;
    if (!auth?.apiKeyId) {
      return next.handle();
    }

    const startedAt = Date.now();

    return next.handle().pipe(
      tap(() => {
        this.persistUsage({
          apiKeyId: auth.apiKeyId,
          method: request.method,
          endpoint: request.originalUrl || request.url,
          statusCode: response.statusCode,
          durationMs: Date.now() - startedAt,
        });
      }),
      catchError((error) => {
        const statusCode = Number(error?.status || error?.statusCode || 500);
        this.persistUsage({
          apiKeyId: auth.apiKeyId,
          method: request.method,
          endpoint: request.originalUrl || request.url,
          statusCode,
          durationMs: Date.now() - startedAt,
        });

        return throwError(() => error);
      }),
    );
  }

  private persistUsage(payload: {
    apiKeyId: string;
    method: string;
    endpoint: string;
    statusCode: number;
    durationMs: number;
  }) {
    void this.developersService.trackApiKeyUsage(payload).catch(() => {
      // Avoid request failures if usage tracking persistence has transient errors.
    });
  }
}
