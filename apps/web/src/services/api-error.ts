import type { AxiosError } from 'axios';
import { translateByKey } from '@/i18n/translate';
import type { ApiErrorEnvelope } from '@/types/api.types';

export type AuthErrorKind =
  | 'AUTH_INVALID_CREDENTIALS'
  | 'AUTH_SESSION_EXPIRED'
  | 'AUTH_UNAUTHORIZED'
  | 'AUTH_FORBIDDEN'
  | 'UNKNOWN';

export function getApiI18n(error: unknown): { key?: string; params?: Record<string, unknown> } {
  const err = error as AxiosError<ApiErrorEnvelope>;
  const data = err.response?.data;
  return {
    key: data?.i18nKey,
    params: data?.i18nParams,
  };
}

export function getApiErrorMessage(error: unknown, fallbackKey = 'common.retry', fallbackText = 'Try again'): string {
  const { key, params } = getApiI18n(error);
  return translateByKey(key, params, translateByKey(fallbackKey, undefined, fallbackText));
}

export function classifyAuthError(error: unknown): AuthErrorKind {
  if (!error || typeof error !== 'object') {
    return 'UNKNOWN';
  }

  const err = error as AxiosError<ApiErrorEnvelope>;
  const status = err.response?.status;
  const key = err.response?.data?.i18nKey;

  if (status === 401 && key === 'auth.invalidCredentials') return 'AUTH_INVALID_CREDENTIALS';
  if (status === 401 && key === 'auth.invalidRefreshToken') return 'AUTH_SESSION_EXPIRED';
  if (status === 401) return 'AUTH_UNAUTHORIZED';
  if (status === 403) return 'AUTH_FORBIDDEN';

  return 'UNKNOWN';
}
