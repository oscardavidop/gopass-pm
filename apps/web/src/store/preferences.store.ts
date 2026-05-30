import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { changeLocale } from '@/i18n';
import { detectBrowserLocale, normalizeLocale } from '@/i18n/locale';

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
      language: normalizeLocale(detectBrowserLocale()),

      setNotification: (key, value) =>
        set((s) => ({ notifications: { ...s.notifications, [key]: value } })),

      setTimezone: (tz) => set({ timezone: tz }),
      setLanguage: (lang) => {
        const safe = normalizeLocale(lang);
        void changeLocale(safe);
        set({ language: safe });
      },
    }),
    {
      name: 'gopass-preferences',
    },
  ),
);
