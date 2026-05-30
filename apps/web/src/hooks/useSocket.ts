import { useEffect, useRef, useState } from 'react';
import { io, type Socket } from 'socket.io-client';
import { useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/store/auth.store';
import { useNotificationsStore } from '@/store/notifications.store';

const WS_URL = import.meta.env.VITE_WS_URL ?? 'http://localhost:3000';

let socketInstance: Socket | null = null;

function getSocket(token: string): Socket {
  if (socketInstance) return socketInstance;
  if (socketInstance !== null) (socketInstance as Socket).disconnect();
  socketInstance = io(`${WS_URL}/events`, {
    auth: { token },
    transports: ['websocket'],
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
  });
  socketRef_global.current = socketInstance;
  return socketInstance;
}

export function disconnectSocket() {
  socketInstance?.disconnect();
  socketInstance = null;
  socketRef_global.current = null;
}

/** Hook: connect to /events namespace, subscribe to global + project room events */
export function useSocket(projectId?: string) {
  const token       = useAuthStore((s) => s.accessToken);
  const currentUser = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();
  const addNotif    = useNotificationsStore((s) => s.addNotification);
  const socketRef   = useRef<Socket | null>(null);
  // Use state so consumers (usePresence) re-render when socket becomes available
  const [socket, setSocket] = useState<Socket | null>(null);

  // Stable refs — read current values without adding them as effect deps.
  // This prevents the event-handler effect from re-running (and emitting leave:project)
  // on every render where auth/queryClient refs change.
  const currentUserRef = useRef(currentUser);
  currentUserRef.current = currentUser;
  const addNotifRef = useRef(addNotif);
  addNotifRef.current = addNotif;
  const queryClientRef = useRef(queryClient);
  queryClientRef.current = queryClient;

  // ── Effect 1: connect once + register ALL event handlers ──────────────────
  // Only re-runs when the access token changes (new login / token refresh).
  useEffect(() => {
    if (!token) return;

    const s = getSocket(token);
    socketRef.current  = s;
    socketRef_global.current = s;
    setSocket(s);

    /* ── Task events ── */
    const onTaskCreated = (task: any) => {
      if (task.projectId) {
        queryClientRef.current.invalidateQueries({ queryKey: ['tasks', 'project', task.projectId] });
        queryClientRef.current.invalidateQueries({ queryKey: ['dashboard'] });
      }
      // Don't notify the person who created the task
      if (currentUserRef.current && task.creatorId === currentUserRef.current.id) return;
      addNotifRef.current({
        type: 'task_created',
        i18nKey: 'notification.taskCreatedRealtime',
        i18nParams: { task: task.title },
        body: task.title,
        projectId: task.projectId,
        taskId: task.id,
        taskTitle: task.title,
        actorName: task.creator?.firstName,
      });
    };

    // Direct cache update — instant for all members, no extra HTTP request
    const onTaskUpdated = (task: any) => {
      if (!task.projectId) return;
      queryClientRef.current.setQueriesData(
        { queryKey: ['tasks', 'project', task.projectId] },
        (old: any) => {
          if (!old?.items) return old;
          const exists = old.items.some((t: any) => t.id === task.id);
          const items = exists
            ? old.items.map((t: any) => (t.id === task.id ? { ...t, ...task } : t))
            : [...old.items, task];
          return { ...old, items };
        },
      );
      // Also update single-task cache if open in drawer
      queryClientRef.current.setQueryData(['tasks', 'detail', task.id], (old: any) =>
        old ? { ...old, ...task } : old,
      );
      queryClientRef.current.invalidateQueries({ queryKey: ['dashboard'] });
    };

    const onTaskDeleted = ({ id, projectId }: { id: string; projectId: string }) => {
      queryClientRef.current.invalidateQueries({ queryKey: ['tasks', 'project', projectId] });
      queryClientRef.current.invalidateQueries({ queryKey: ['dashboard'] });
      queryClientRef.current.removeQueries({ queryKey: ['task', id] });
    };

    s.on('task:created', onTaskCreated);
    s.on('task:updated', onTaskUpdated);
    s.on('task:deleted', onTaskDeleted);

    /* ── Member events ── */
    const onMemberAdded = (data: any) => {
      if (!data.projectId) return;
      // Invalidate all project queries so member lists refresh for everyone
      queryClientRef.current.invalidateQueries({ queryKey: ['projects'] });
    };

    const onMemberRemoved = (data: any) => {
      if (!data.projectId) return;
      if (currentUserRef.current && data.userId === currentUserRef.current.id) {
        // Current user was kicked — broadcast a window event so ProjectDetailPage redirects
        window.dispatchEvent(
          new CustomEvent('project:access_revoked', { detail: { projectId: data.projectId } }),
        );
        queryClientRef.current.invalidateQueries({ queryKey: ['projects'] });
      } else {
        // Another member was removed — refresh member list
        queryClientRef.current.invalidateQueries({ queryKey: ['projects'] });
      }
    };

    s.on('project:member_added', onMemberAdded);
    s.on('project:member_removed', onMemberRemoved);

    /* ── Server-pushed notifications (cron jobs, assignments, etc.) ── */
    const onNotification = (data: any) => {
      if (data.type === 'project_access_revoked') {
        // Also handled by onMemberRemoved but backend sends this too as a fallback
        window.dispatchEvent(
          new CustomEvent('project:access_revoked', { detail: { projectId: data.projectId } }),
        );
        queryClientRef.current.invalidateQueries({ queryKey: ['projects'] });
        return;
      }
      addNotifRef.current({
        type: data.type,
        title: data.title,
        body: data.body ?? data.message ?? '',
        i18nKey: data.i18nKey,
        i18nParams: data.i18nParams,
        projectId: data.projectId,
        taskId: data.taskId,
        taskTitle: data.taskTitle,
        actorName: data.actorName,
      });
    };
    s.on('notification', onNotification);

    return () => {
      s.off('task:created', onTaskCreated);
      s.off('task:updated', onTaskUpdated);
      s.off('task:deleted', onTaskDeleted);
      s.off('project:member_added', onMemberAdded);
      s.off('project:member_removed', onMemberRemoved);
      s.off('notification', onNotification);
    };
  }, [token]); // ← token only: handlers are stable via refs

  // ── Effect 2: join/leave project room when projectId or socket changes ────
  // Isolated so it doesn't cause handler re-registration on every re-render.
  useEffect(() => {
    if (!socket || !projectId) return;
    socket.emit('join:project', projectId);
    return () => {
      socket.emit('leave:project', projectId);
    };
  }, [socket, projectId]);

  return socket;
}

/** Get current socket instance (for emitting from components) */
export function useSocketInstance() {
  return socketRef_global.current;
}

// Module-level ref for imperative access
const socketRef_global: { current: Socket | null } = { current: socketInstance };
