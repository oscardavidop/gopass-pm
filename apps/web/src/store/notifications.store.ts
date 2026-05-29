import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type NotificationType =
  | 'task_created'
  | 'task_updated'
  | 'task_deleted'
  | 'task_assigned'
  | 'task_overdue'
  | 'task_due_reminder'
  | 'comment_added'
  | 'project_updated'
  | 'project_access_revoked'
  | 'weekly_digest'
  | 'mention';

export interface AppNotification {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  read: boolean;
  createdAt: string;
  projectId?: string;
  taskId?: string;
  projectName?: string;
  taskTitle?: string;
  actorName?: string;
}

interface NotificationsState {
  notifications: AppNotification[];
  unread: number;
  addNotification: (n: Omit<AppNotification, 'id' | 'read' | 'createdAt'>) => void;
  markRead: (id: string) => void;
  markAllRead: () => void;
  dismiss: (id: string) => void;
  clearAll: () => void;
}

export const useNotificationsStore = create<NotificationsState>()(
  persist(
    (set, get) => ({
      notifications: [],
      unread: 0,

      addNotification: (n) => {
        // Deduplicate: skip if same type+title+taskId appeared within 2 seconds
        const existing = get().notifications;
        const now = Date.now();
        const isDuplicate = existing.some(
          (e) =>
            e.type === n.type &&
            e.title === n.title &&
            (n.taskId ? e.taskId === n.taskId : true) &&
            now - new Date(e.createdAt).getTime() < 2000,
        );
        if (isDuplicate) return;

        const newItem: AppNotification = {
          ...n,
          id: crypto.randomUUID(),
          read: false,
          createdAt: new Date().toISOString(),
        };
        set((s) => ({
          notifications: [newItem, ...s.notifications].slice(0, 50),
          unread: s.unread + 1,
        }));
      },

      markRead: (id) =>
        set((s) => ({
          notifications: s.notifications.map((n) =>
            n.id === id ? { ...n, read: true } : n,
          ),
          unread: Math.max(0, s.unread - (s.notifications.find((n) => n.id === id && !n.read) ? 1 : 0)),
        })),

      markAllRead: () =>
        set((s) => ({
          notifications: s.notifications.map((n) => ({ ...n, read: true })),
          unread: 0,
        })),

      dismiss: (id) =>
        set((s) => ({
          notifications: s.notifications.filter((n) => n.id !== id),
          unread: s.unread - (s.notifications.find((n) => n.id === id && !n.read) ? 1 : 0),
        })),

      clearAll: () => set({ notifications: [], unread: 0 }),
    }),
    {
      name: 'gopass-notifications',
      partialize: (s) => ({ notifications: s.notifications, unread: s.unread }),
    },
  ),
);
