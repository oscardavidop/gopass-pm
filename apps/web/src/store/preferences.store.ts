import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface NotificationPreferences {
  taskAssigned: boolean;
  taskDue: boolean;
  projectUpdates: boolean;
  weekly: boolean;
}

interface PreferencesState {
  notifications: NotificationPreferences;
  timezone: string;
  language: string;
  setNotification: (key: keyof NotificationPreferences, value: boolean) => void;
  setTimezone: (tz: string) => void;
  setLanguage: (lang: string) => void;
}

export const usePreferencesStore = create<PreferencesState>()(
  persist(
    (set) => ({
      notifications: {
        taskAssigned:   true,
        taskDue:        true,
        projectUpdates: false,
        weekly:         true,
      },
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone ?? 'UTC',
      language: 'en',

      setNotification: (key, value) =>
        set((s) => ({ notifications: { ...s.notifications, [key]: value } })),

      setTimezone: (tz) => set({ timezone: tz }),
      setLanguage: (lang) => set({ language: lang }),
    }),
    {
      name: 'gopass-preferences',
    },
  ),
);
