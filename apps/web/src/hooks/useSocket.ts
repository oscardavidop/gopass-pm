import { useEffect, useRef, useCallback } from 'react';
import { io, type Socket } from 'socket.io-client';
import { useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/store/auth.store';
import { useNotificationsStore } from '@/store/notifications.store';

const WS_URL = import.meta.env.VITE_WS_URL ?? 'http://localhost:3000';

let socketInstance: Socket | null = null;

function getSocket(token: string): Socket {
  if (socketInstance) return socketInstance;
  socketInstance?.disconnect();
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
  const queryClient = useQueryClient();
  const addNotif    = useNotificationsStore((s) => s.addNotification);
  const socketRef   = useRef<Socket | null>(null);

  const invalidate = useCallback((projectId: string) => {
    queryClient.invalidateQueries({ queryKey: ['tasks', 'project', projectId] });
    queryClient.invalidateQueries({ queryKey: ['dashboard'] });
  }, [queryClient]);

  useEffect(() => {
    if (!token) return;

    const socket = getSocket(token);
    socketRef.current = socket;

    // Join project room when projectId provided
    if (projectId) {
      socket.emit('join:project', projectId);
    }

    /* ── Task events ── */
    const onTaskCreated = (task: any) => {
      if (task.projectId) invalidate(task.projectId);
      addNotif({
        type: 'task_created',
        title: 'New task created',
        body: task.title,
        projectId: task.projectId,
        taskId: task.id,
        taskTitle: task.title,
        actorName: task.creator?.firstName,
      });
    };

    const onTaskUpdated = (task: any) => {
      if (task.projectId) invalidate(task.projectId);
    };

    const onTaskDeleted = ({ id, projectId }: { id: string; projectId: string }) => {
      invalidate(projectId);
      queryClient.removeQueries({ queryKey: ['task', id] });
    };

    socket.on('task:created', onTaskCreated);
    socket.on('task:updated', onTaskUpdated);
    socket.on('task:deleted', onTaskDeleted);

    return () => {
      socket.off('task:created', onTaskCreated);
      socket.off('task:updated', onTaskUpdated);
      socket.off('task:deleted', onTaskDeleted);
      if (projectId) socket.emit('leave:project', projectId);
    };
  }, [token, projectId, invalidate, addNotif, queryClient]);

  return socketRef.current;
}

/** Get current socket instance (for emitting from components) */
export function useSocketInstance() {
  return socketRef_global.current;
}

// Module-level ref for imperative access
const socketRef_global: { current: Socket | null } = { current: socketInstance };
