import type { AxiosError } from 'axios';
import { translateByKey } from '@/i18n/translate';
import type { ApiErrorEnvelope } from '@/types/api.types';

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
