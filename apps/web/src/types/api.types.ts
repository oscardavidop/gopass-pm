export interface ApiEnvelope<T> {
  success: boolean;
  data: T;
  message?: string;
  i18nKey?: string;
  i18nParams?: Record<string, unknown>;
  meta?: Record<string, unknown>;
}

export interface ApiErrorEnvelope {
  success: false;
  statusCode: number;
  i18nKey?: string;
  i18nParams?: Record<string, unknown>;
  path?: string;
  timestamp?: string;
}
