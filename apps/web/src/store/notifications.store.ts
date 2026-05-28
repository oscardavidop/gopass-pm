import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type NotificationType =
  | 'task_created'
  | 'task_updated'
  | 'task_deleted'
  | 'task_assigned'
  | 'task_overdue'
  | 'comment_added'
  | 'project_updated'
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
