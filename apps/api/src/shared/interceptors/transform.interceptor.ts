import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable, map } from 'rxjs';
import { StreamableFile } from '@nestjs/common';

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  i18nKey?: string;
  i18nParams?: Record<string, unknown>;
  meta?: Record<string, unknown>;
}

function isApiResponse<T>(value: unknown): value is ApiResponse<T> {
  if (!value || typeof value !== 'object') return false;
  if (!('success' in value) || !('data' in value)) return false;
  return typeof (value as { success: unknown }).success === 'boolean';
}

@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<T, ApiResponse<T> | StreamableFile> {
  intercept(_context: ExecutionContext, next: CallHandler<T>): Observable<ApiResponse<T> | StreamableFile> {
    return next.handle().pipe(
      map((data) => {
        // If the handler already returns our envelope, pass through
          if (data instanceof StreamableFile) {
          return data;
        }
        if (isApiResponse<T>(data)) {
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
      } ),
    );
  } 
}
