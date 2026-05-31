import axios from 'axios';
import { useAuthStore } from '@/store/auth.store';
import { usePreferencesStore } from '@/store/preferences.store';
import { WEB_ENV } from '@/config/env';

export const api = axios.create({
  baseURL: WEB_ENV.apiUrl,
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
});

// Inject access token on every request
api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  const locale = usePreferencesStore.getState().language;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  if (locale) config.headers['Accept-Language'] = locale;
  return config;
});

let refreshing: Promise<void> | null = null;

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;

    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;

      if (!refreshing) {
        refreshing = (async () => {
          try {
            const { data } = await axios.post(
              `${WEB_ENV.apiUrl}/auth/refresh`,
              {},
              { withCredentials: true },
            );
            useAuthStore.getState().setAccessToken(data.data.accessToken);
          } catch {
            useAuthStore.getState().clearAuth();
            const path = `${window.location.pathname}${window.location.search}${window.location.hash}`;
            const onAuthPage = path.startsWith('/login') || path.startsWith('/register') || path.startsWith('/forgot-password') || path.startsWith('/reset-password') || path.startsWith('/verify-email');
            if (onAuthPage) {
              window.location.href = '/login';
            } else {
              window.location.href = `/login?redirectTo=${encodeURIComponent(path)}`;
            }
          } finally {
            refreshing = null;
          }
        })();
      }

      await refreshing;
      original.headers.Authorization = `Bearer ${useAuthStore.getState().accessToken}`;
      return api(original);
    }

    return Promise.reject(error);
  },
);
