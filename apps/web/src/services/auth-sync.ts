import { useAuthStore } from '@/store/auth.store';
import type { User } from '@/types/auth.types';

export interface AuthSnapshot {
  user: User | null;
  accessToken: string | null;
  sessionId: string | null;
}

interface AuthSyncMessage extends AuthSnapshot {
  source: string;
  timestamp: number;
}

const AUTH_SYNC_KEY = 'gopass-auth-sync';
const AUTH_SYNC_CHANNEL = 'gopass-auth-channel';
const AUTH_SYNC_TTL_MS = 5_000;

function getChannel() {
  if (typeof window === 'undefined' || !('BroadcastChannel' in window)) return null;
  return new BroadcastChannel(AUTH_SYNC_CHANNEL);
}

function getSourceId() {
  if (typeof window === 'undefined') return 'server';
  const key = '__gopass_auth_tab_id';
  const existing = window.sessionStorage.getItem(key);
  if (existing) return existing;
  const next = crypto.randomUUID();
  window.sessionStorage.setItem(key, next);
  return next;
}

export function broadcastAuthSnapshot(snapshot: AuthSnapshot) {
  if (typeof window === 'undefined') return;
  const message: AuthSyncMessage = {
    ...snapshot,
    source: getSourceId(),
    timestamp: Date.now(),
  };

  const payload = JSON.stringify(message);
  window.localStorage.setItem(AUTH_SYNC_KEY, payload);
  const channel = getChannel();
  channel?.postMessage(message);
  channel?.close();
}

export function subscribeAuthSnapshot(onMessage: (snapshot: AuthSnapshot) => void) {
  if (typeof window === 'undefined') return () => undefined;
  const sourceId = getSourceId();

  const applyMessage = (raw: string | null) => {
    if (!raw) return;
    try {
      const message = JSON.parse(raw) as AuthSyncMessage;
      if (!message || message.source === sourceId) return;
      if (Date.now() - message.timestamp > AUTH_SYNC_TTL_MS) return;
      onMessage({
        user: message.user,
        accessToken: message.accessToken,
        sessionId: message.sessionId,
      });
    } catch {
      // Ignore malformed sync payloads.
    }
  };

  const onStorage = (event: StorageEvent) => {
    if (event.key === AUTH_SYNC_KEY) {
      applyMessage(event.newValue);
    }
  };

  const channel = getChannel();
  const onChannel = (event: MessageEvent<AuthSyncMessage>) => {
    const message = event.data;
    if (!message || message.source === sourceId) return;
    if (Date.now() - message.timestamp > AUTH_SYNC_TTL_MS) return;
    onMessage({
      user: message.user,
      accessToken: message.accessToken,
      sessionId: message.sessionId,
    });
  };

  window.addEventListener('storage', onStorage);
  channel?.addEventListener('message', onChannel as EventListener);

  return () => {
    window.removeEventListener('storage', onStorage);
    channel?.removeEventListener('message', onChannel as EventListener);
    channel?.close();
  };
}

export function applyRemoteAuthSnapshot(snapshot: AuthSnapshot) {
  useAuthStore.setState({
    user: snapshot.user,
    accessToken: snapshot.accessToken,
    sessionId: snapshot.sessionId,
  });
}
