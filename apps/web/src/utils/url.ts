import { WEB_ENV } from '@/config/env';

export function resolveApiAssetUrl(raw?: string | null): string {
  if (!raw) return '';
  if (/^(https?:\/\/|blob:|data:)/i.test(raw)) return raw;

  try {
    return new URL(raw, WEB_ENV.apiUrl).toString();
  } catch {
    return raw;
  }
}
