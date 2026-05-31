import { useEffect, useRef, useState } from 'react';
import { io, type Socket } from 'socket.io-client';
import { useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { useAuthStore } from '@/store/auth.store';
import { useNotificationsStore } from '@/store/notifications.store';
import { useCollaborationStore } from '@/store/collaboration.store';
import { WEB_ENV } from '@/config/env';

const WS_URL = WEB_ENV.wsUrl;

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
  const setProjectPresence = useCollaborationStore((s) => s.setProjectPresence);
  const setTaskPresence = useCollaborationStore((s) => s.setTaskPresence);
  const pushTaskHighlight = useCollaborationStore((s) => s.pushTaskHighlight);
  const socketRef   = useRef<Socket | null>(null);
  const lastToastAtRef = useRef<Record<string, number>>({});
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
  const setProjectPresenceRef = useRef(setProjectPresence);
  setProjectPresenceRef.current = setProjectPresence;
  const setTaskPresenceRef = useRef(setTaskPresence);
  setTaskPresenceRef.current = setTaskPresence;
  const pushTaskHighlightRef = useRef(pushTaskHighlight);
  pushTaskHighlightRef.current = pushTaskHighlight;

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

    const formatActorName = (actor?: any) => {
      if (!actor) return 'A teammate';
      return [actor.firstName, actor.lastName].filter(Boolean).join(' ').trim() || 'A teammate';
    };

    const notifyCollab = ({
      dedupeKey,
      message,
      icon,
      cooldownMs = 9000,
    }: {
      dedupeKey: string;
      message: string;
      icon: string;
      cooldownMs?: number;
    }) => {
      const now = Date.now();
      const lastAt = lastToastAtRef.current[dedupeKey] ?? 0;
      if (now - lastAt < cooldownMs) return;
      lastToastAtRef.current[dedupeKey] = now;
      toast(message, { icon });
    };

    const onTaskCreatedRealtime = (payload: any) => {
      if (!payload?.taskId || !payload?.projectId) return;
      pushTaskHighlightRef.current({
        taskId: payload.taskId,
        projectId: payload.projectId,
        actor: payload.actor,
        kind: 'created',
        message: `${formatActorName(payload.actor)} created this task`,
        timestamp: payload.timestamp ?? new Date().toISOString(),
      });

      if (payload.actor?.id && payload.actor.id !== currentUserRef.current?.id) {
        notifyCollab({
          dedupeKey: `task.created:${payload.projectId}:${payload.taskId}`,
          message: `${formatActorName(payload.actor)} created a task`,
          icon: '✨',
        });
      }

      queryClientRef.current.invalidateQueries({ queryKey: ['dashboard', 'activity'] });
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

    const onTaskUpdatedRealtime = (payload: any) => {
      if (!payload?.taskId || !payload?.projectId) return;
      pushTaskHighlightRef.current({
        taskId: payload.taskId,
        projectId: payload.projectId,
        actor: payload.actor,
        kind: 'updated',
        message: `${formatActorName(payload.actor)} updated this task`,
        timestamp: payload.timestamp ?? new Date().toISOString(),
      });

      queryClientRef.current.invalidateQueries({ queryKey: ['dashboard', 'activity'] });
    };

    const onTaskMovedRealtime = (payload: any) => {
      if (!payload?.taskId || !payload?.projectId) return;
      pushTaskHighlightRef.current({
        taskId: payload.taskId,
        projectId: payload.projectId,
        actor: payload.actor,
        kind: 'moved',
        message: `${formatActorName(payload.actor)} moved this task`,
        from: payload.from,
        to: payload.to,
        timestamp: payload.timestamp ?? new Date().toISOString(),
      }, 8000);

      queryClientRef.current.invalidateQueries({ queryKey: ['dashboard', 'activity'] });
    };

    const onTaskDeletedRealtime = (payload: any) => {
      if (!payload?.taskId || !payload?.projectId) return;
      if (payload.actor?.id && payload.actor.id !== currentUserRef.current?.id) {
        notifyCollab({
          dedupeKey: `task.deleted:${payload.projectId}:${payload.taskId}`,
          message: `${formatActorName(payload.actor)} deleted a task`,
          icon: '🗑️',
          cooldownMs: 12000,
        });
      }
      queryClientRef.current.invalidateQueries({ queryKey: ['dashboard', 'activity'] });
    };

    const onProjectUpdatedRealtime = (payload: any) => {
      if (!payload?.projectId) return;
      queryClientRef.current.invalidateQueries({ queryKey: ['projects'] });
      queryClientRef.current.invalidateQueries({ queryKey: ['dashboard', 'activity'] });

      if (payload.actor?.id && payload.actor.id !== currentUserRef.current?.id) {
        notifyCollab({
          dedupeKey: `project.updated:${payload.projectId}`,
          message: `${formatActorName(payload.actor)} updated project`,
          icon: '📁',
          cooldownMs: 12000,
        });
      }
    };

    const onProjectDeletedRealtime = (payload: any) => {
      if (!payload?.projectId) return;
      queryClientRef.current.invalidateQueries({ queryKey: ['projects'] });
      queryClientRef.current.invalidateQueries({ queryKey: ['dashboard', 'activity'] });
      addNotifRef.current({
        type: 'project_deleted',
        i18nKey: 'notification.projectDeleted',
        i18nParams: { projectName: payload.projectName },
        projectId: payload.projectId,
        projectName: payload.projectName,
      });
      window.dispatchEvent(new CustomEvent('project:deleted', { detail: { projectId: payload.projectId } }));
    };

    const onTaskPresence = (payload: any) => {
      if (!payload?.projectId || !payload?.taskId) return;

      const currentUserId = currentUserRef.current?.id;
      const viewingByUser = new Map<string, any>();
      for (const user of payload.viewing ?? []) {
        if (!user?.id || user.id === currentUserId) continue;
        if (!viewingByUser.has(user.id)) viewingByUser.set(user.id, user);
      }

      const editingByUser = new Map<string, any>();
      for (const entry of payload.editing ?? []) {
        const user = entry?.user;
        if (!user?.id || user.id === currentUserId) continue;
        if (!editingByUser.has(user.id)) editingByUser.set(user.id, { user, field: entry?.field });
      }

      setTaskPresenceRef.current({
        projectId: payload.projectId,
        taskId: payload.taskId,
        viewing: Array.from(viewingByUser.values()),
        editing: Array.from(editingByUser.values()),
      });
    };

    const onPresenceUpdate = (payload: any) => {
      if (!projectId) return;
      const users = Array.isArray(payload) ? payload : payload?.users;
      if (!Array.isArray(users)) return;
      setProjectPresenceRef.current(projectId, users);
    };

    const onActivityCreated = (payload: any) => {
      queryClientRef.current.invalidateQueries({ queryKey: ['dashboard', 'activity'] });
      if (payload?.projectId) {
        queryClientRef.current.invalidateQueries({ queryKey: ['projects', 'detail', payload.projectId, 'activity'] });
      }
      if (payload?.activity?.taskId) {
        queryClientRef.current.invalidateQueries({ queryKey: ['tasks', 'detail', payload.activity.taskId] });
      }
    };

    const onTaskDeleted = ({ id, projectId }: { id: string; projectId: string }) => {
      queryClientRef.current.invalidateQueries({ queryKey: ['tasks', 'project', projectId] });
      queryClientRef.current.invalidateQueries({ queryKey: ['dashboard'] });
      queryClientRef.current.removeQueries({ queryKey: ['task', id] });
    };

    s.on('task:created', onTaskCreated);
    s.on('task:updated', onTaskUpdated);
    s.on('task:deleted', onTaskDeleted);
    s.on('task.created', onTaskCreatedRealtime);
    s.on('task.updated', onTaskUpdatedRealtime);
    s.on('task.moved', onTaskMovedRealtime);
    s.on('task.deleted', onTaskDeletedRealtime);
    s.on('project.updated', onProjectUpdatedRealtime);
    s.on('project.deleted', onProjectDeletedRealtime);
    s.on('task.presence', onTaskPresence);
    s.on('presence:update', onPresenceUpdate);
    s.on('activity.created', onActivityCreated);

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
      const fallbackI18nByType: Record<string, string> = {
        task_assigned: 'notification.taskAssigned',
        task_overdue: 'notification.taskOverdue',
        task_due_reminder: 'notification.taskDueReminder',
        project_updated: 'notification.projectUpdated',
        project_deleted: 'notification.projectDeleted',
        project_access_revoked: 'notification.projectAccessRevoked',
      };

      if (data.type === 'project_access_revoked') {
        // Also handled by onMemberRemoved but backend sends this too as a fallback
        window.dispatchEvent(
          new CustomEvent('project:access_revoked', { detail: { projectId: data.projectId } }),
        );
        queryClientRef.current.invalidateQueries({ queryKey: ['projects'] });
        return;
      }
      if (data.type === 'project_deleted') {
        queryClientRef.current.invalidateQueries({ queryKey: ['projects'] });
        window.dispatchEvent(new CustomEvent('project:deleted', { detail: { projectId: data.projectId } }));
      }
      addNotifRef.current({
        type: data.type,
        title: data.title,
        body: data.body ?? data.message ?? '',
        i18nKey: data.i18nKey ?? fallbackI18nByType[data.type],
        i18nParams: data.i18nParams,
        projectId: data.projectId,
        taskId: data.taskId,
        taskTitle: data.taskTitle,
        projectName: data.projectName ?? data.i18nParams?.projectName,
        actorName: data.actorName,
      });
    };
    s.on('notification', onNotification);

    return () => {
      s.off('task:created', onTaskCreated);
      s.off('task:updated', onTaskUpdated);
      s.off('task:deleted', onTaskDeleted);
      s.off('task.created', onTaskCreatedRealtime);
      s.off('task.updated', onTaskUpdatedRealtime);
      s.off('task.moved', onTaskMovedRealtime);
      s.off('task.deleted', onTaskDeletedRealtime);
      s.off('project.updated', onProjectUpdatedRealtime);
      s.off('project.deleted', onProjectDeletedRealtime);
      s.off('task.presence', onTaskPresence);
      s.off('presence:update', onPresenceUpdate);
      s.off('activity.created', onActivityCreated);
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
