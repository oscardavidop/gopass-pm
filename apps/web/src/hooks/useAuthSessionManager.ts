import { useEffect, useRef } from 'react';
import { useAuthStore } from '@/store/auth.store';
import { applyRemoteAuthSnapshot, subscribeAuthSnapshot } from '@/services/auth-sync';
import { refreshAuthSession } from '@/services/api';

function getTokenExpiry(token: string | null) {
  if (!token) return null;
  try {
    const [, payload] = token.split('.');
    if (!payload) return null;
    const decoded = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')));
    const exp = typeof decoded?.exp === 'number' ? decoded.exp : Number(decoded?.exp);
    return Number.isFinite(exp) ? exp * 1000 : null;
  } catch {
    return null;
  }
}

export function useAuthSessionManager() {
  const accessToken = useAuthStore((s) => s.accessToken);
  const sessionId = useAuthStore((s) => s.sessionId);
  const cleanupRef = useRef<(() => void) | null>(null);
  const timeoutRef = useRef<number | null>(null);

  useEffect(() => {
    cleanupRef.current?.();
    cleanupRef.current = subscribeAuthSnapshot((snapshot) => {
      const current = useAuthStore.getState();
      if (
        current.accessToken === snapshot.accessToken &&
        current.sessionId === snapshot.sessionId &&
        current.user?.id === snapshot.user?.id
      ) {
        return;
      }

      if (!snapshot.accessToken || !snapshot.user) {
        useAuthStore.setState({ user: null, accessToken: null, sessionId: null });
        return;
      }

      applyRemoteAuthSnapshot(snapshot);
    });

    return () => {
      cleanupRef.current?.();
      cleanupRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (timeoutRef.current) {
      window.clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    if (!accessToken || !sessionId) return;

    const expiry = getTokenExpiry(accessToken);
    if (!expiry) return;

    const refreshBeforeMs = 60_000;
    const delay = Math.max(expiry - Date.now() - refreshBeforeMs, 0);

    timeoutRef.current = window.setTimeout(() => {
      void refreshAuthSession();
    }, delay);

    return () => {
      if (timeoutRef.current) {
        window.clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, [accessToken, sessionId]);
}
