import axios from 'axios';
import { useAuthStore } from '@/store/auth.store';
import { usePreferencesStore } from '@/store/preferences.store';
import { WEB_ENV } from '@/config/env';
import { broadcastAuthSnapshot } from '@/services/auth-sync';

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

let refreshing: Promise<boolean> | null = null;

function isAuthFlowRequest(url?: string) {
  if (!url) return false;
  return ['/auth/login', '/auth/register', '/auth/forgot-password', '/auth/reset-password', '/auth/oauth', '/auth/verify-email', '/auth/resend-verification'].some((path) => url.includes(path));
}

function getRedirectPath() {
  if (typeof window === 'undefined') return '/login';
  const path = `${window.location.pathname}${window.location.search}${window.location.hash}`;
  const onAuthPage = path.startsWith('/login') || path.startsWith('/register') || path.startsWith('/forgot-password') || path.startsWith('/reset-password') || path.startsWith('/verify-email');
  return onAuthPage ? '/login' : `/login?redirectTo=${encodeURIComponent(path)}`;
}

function clearSessionAndRedirect() {
  useAuthStore.getState().clearAuth();
  if (typeof window !== 'undefined') {
    window.location.href = getRedirectPath();
  }
}

export async function refreshAuthSession() {
  if (!refreshing) {
    refreshing = (async () => {
      try {
        const { data } = await axios.post(
          `${WEB_ENV.apiUrl}/auth/refresh`,
          {},
          { withCredentials: true },
        );
        const payload = data.data as { accessToken: string; sessionId: string };
        const currentUser = useAuthStore.getState().user;
        useAuthStore.setState({ accessToken: payload.accessToken, sessionId: payload.sessionId });
        broadcastAuthSnapshot({ user: currentUser, accessToken: payload.accessToken, sessionId: payload.sessionId });
        return true;
      } catch {
        clearSessionAndRedirect();
        return false;
      } finally {
        refreshing = null;
      }
    })();
  }

  return refreshing;
}

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;

    if (isAuthFlowRequest(original?.url)) {
      return Promise.reject(error);
    }

    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;

      const refreshed = await refreshAuthSession();
      if (!refreshed) return Promise.reject(error);
      original.headers = {
        ...original.headers,
        Authorization: `Bearer ${useAuthStore.getState().accessToken}`,
      };
      return api(original);
    }

    return Promise.reject(error);
  },
);
