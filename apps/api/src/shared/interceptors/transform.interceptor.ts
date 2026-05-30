import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  i18nKey?: string;
  i18nParams?: Record<string, unknown>;
  meta?: Record<string, unknown>;
}

@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<T, ApiResponse<T>> {
  intercept(_context: ExecutionContext, next: CallHandler): Observable<ApiResponse<T>> {
    return next.handle().pipe(
      map((data) => {
        // If the handler already returns our envelope, pass through
        if (data && typeof data === 'object' && 'success' in data) {
          return data;
        }

        if (data && typeof data === 'object' && 'i18nKey' in data) {
          const typed = data as Record<string, unknown>;
          const payload = 'data' in typed ? (typed.data as T) : (typed as T);
          return {
            success: true,
            data: payload,
            i18nKey: typed.i18nKey as string,
            i18nParams: typed.i18nParams as Record<string, unknown> | undefined,
            meta: typed.meta as Record<string, unknown> | undefined,
          };
        }

        return {
          success: true,
          data,
          i18nKey: 'common.success',
        };
      }),
    );
  }
}
