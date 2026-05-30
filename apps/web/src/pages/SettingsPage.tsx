import { motion } from 'framer-motion';
import { Moon, Sun, Bell, Globe, Palette, Check, Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useTheme } from '@/hooks/useTheme';
import { usePreferencesStore } from '@/store/preferences.store';
import { cn } from '@/utils/cn';
import { getLocaleLabel, getSupportedLocales } from '@/i18n/locale';

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={cn(
        'relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors duration-200',
        checked ? 'bg-primary' : 'bg-secondary',
      )}
    >
      <span
        className={cn(
          'pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform duration-200',
          checked ? 'translate-x-4' : 'translate-x-0',
        )}
      />
    </button>
  );
}

type ThemeOption = 'light' | 'dark';
const THEMES: { value: ThemeOption; label: string; icon: typeof Moon }[] = [
  { value: 'light', label: 'Light', icon: Sun },
  { value: 'dark',  label: 'Dark',  icon: Moon },
];

const TIMEZONES = [
  'UTC',
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'America/Sao_Paulo',
  'America/Bogota',
  'Europe/London',
  'Europe/Paris',
  'Europe/Berlin',
  'Asia/Tokyo',
  'Asia/Shanghai',
  'Australia/Sydney',
];

const LANGUAGES = [
  ...getSupportedLocales().map((value) => ({ value, label: getLocaleLabel(value) })),
];

export function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const prefs = usePreferencesStore();
  const { t } = useTranslation();

  const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.07 } } };
  const item = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } };

  return (
    <div className="max-w-2xl mx-auto space-y-6 page-enter">
      <div>
        <h1 className="text-2xl font-bold">{t('app.settings')}</h1>
        <p className="text-sm text-muted-foreground mt-0.5">{t('app.settingsDescription')}</p>
      </div>

      <motion.div variants={container} initial="hidden" animate="show" className="space-y-5">

        {/* Appearance */}
        <motion.div variants={item}>
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Palette className="h-4 w-4" />
                {t('app.appearance')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm font-medium mb-3">{t('app.theme')}</p>
                <div className="grid grid-cols-2 gap-3">
                  {THEMES.map(({ value, label, icon: Icon }) => (
                    <button
                      key={value}
                      onClick={() => setTheme(value)}
                      className={cn(
                        'flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all',
                        theme === value
                          ? 'border-primary bg-primary/5 text-primary'
                          : 'border-border hover:border-primary/40 text-muted-foreground hover:text-foreground',
                      )}
                    >
                      <Icon className="h-5 w-5" />
                      <span className="text-xs font-medium">{value === 'light' ? t('theme.light') : t('theme.dark')}</span>
                      {theme === value && <Check className="h-3 w-3" />}
                    </button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Notifications — persisted to localStorage via Zustand */}
        <motion.div variants={item}>
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Bell className="h-4 w-4" />
                {t('app.notifications')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-xs text-muted-foreground -mt-1">
                {t('app.autoSaved')}
              </p>
              {(
                [
                  { key: 'taskAssigned'   as const, label: t('notification.taskAssigned'),   desc: t('notification.taskAssignedDesc') },
                  { key: 'taskDue'        as const, label: t('notification.taskDue'), desc: t('notification.taskDueDesc') },
                  { key: 'projectUpdates' as const, label: t('notification.projectUpdates'),        desc: t('notification.projectUpdatesDesc') },
                  { key: 'weekly'         as const, label: t('notification.weekly'),          desc: t('notification.weeklyDesc') },
                ]
              ).map(({ key, label, desc }) => (
                <div key={key} className="flex items-center justify-between py-1">
                  <div>
                    <p className="text-sm font-medium">{label}</p>
                    <p className="text-xs text-muted-foreground">{desc}</p>
                  </div>
                  <Toggle
                    checked={prefs.notifications[key]}
                    onChange={(v) => prefs.setNotification(key, v)}
                  />
                </div>
              ))}
            </CardContent>
          </Card>
        </motion.div>

        {/* Language & Region */}
        <motion.div variants={item}>
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Globe className="h-4 w-4" />
                {t('app.languageRegion')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">{t('app.language')}</label>
                <select
                  value={prefs.language}
                  onChange={(e) => prefs.setLanguage(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-background/60 border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  {LANGUAGES.map(({ value, label }) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">{t('app.timezone')}</label>
                <select
                  value={prefs.timezone}
                  onChange={(e) => prefs.setTimezone(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-background/60 border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  {TIMEZONES.map((tz) => (
                    <option key={tz} value={tz}>{tz}</option>
                  ))}
                </select>
              </div>
              <p className="text-xs text-muted-foreground pt-1">
                {t('app.autoSaved')}
              </p>
            </CardContent>
          </Card>
        </motion.div>

      </motion.div>
    </div>
  );
}
