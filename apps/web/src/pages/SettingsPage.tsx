import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { Moon, Sun, Bell, Globe, Palette, Check, Loader2, Shield, KeyRound } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useTheme } from '@/hooks/useTheme';
import { useChangePassword, useLogoutAllSessions, useLogoutSession, useSessions } from '@/hooks/useAuth';
import { usePreferencesStore } from '@/store/preferences.store';
import { useAuthStore } from '@/store/auth.store';
import { usersService } from '@/services/users.service';
import { cn } from '@/utils/cn';
import { getLocaleLabel, getSupportedLocales } from '@/i18n/locale';
import { Monitor, MapPin, LogOut } from 'lucide-react';

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
  { value: 'dark', label: 'Dark', icon: Moon },
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



import { ChevronDown } from 'lucide-react';

export function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const prefs = usePreferencesStore();
  const { t } = useTranslation();
  const currentSessionId = useAuthStore((s) => s.sessionId);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [prefsLoaded, setPrefsLoaded] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const changePassword = useChangePassword();
  const sessions = useSessions();
  const logoutAllSessions = useLogoutAllSessions();
  const logoutSession = useLogoutSession();

  useEffect(() => {
    let cancelled = false;
    usersService.getNotificationPreferences()
      .then((serverPrefs) => {
        if (cancelled) return;
        (Object.keys(serverPrefs) as Array<keyof typeof serverPrefs>).forEach((key) => {
          prefs.setNotification(key as any, !!serverPrefs[key]);
        });
      })
      .catch(() => undefined)
      .finally(() => {
        if (!cancelled) setPrefsLoaded(true);
      });

    return () => {
      cancelled = true;
    };
  }, [prefs]);

  const updateNotificationPref = async (
    key: keyof typeof prefs.notifications,
    value: boolean,
  ) => {
    prefs.setNotification(key, value);
    setSavingKey(key);
    try {
      await usersService.updateNotificationPreferences({ [key]: value });
    } finally {
      setSavingKey(null);
    }
  };

  const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.07 } } };
  const item = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } };

  return (
    <div className="max-w-2xl mx-auto space-y-6 page-enter">
      <div>
        <h1 className="text-2xl font-bold">{t('app.settings')}</h1>
        <p className="text-sm text-muted-foreground mt-0.5">{t('app.settingsDescription')}</p>
      </div>

      <motion.div variants={container} initial="hidden" animate="show" className="space-y-5">

        {/* 1. Appearance */}
        <motion.div variants={item}>
          <Card className="overflow-hidden border-border/50 shadow-sm">
            <CardHeader className="border-b border-border/50 bg-muted/10 px-6 py-4">
              <CardTitle className="flex items-center gap-3 text-base font-semibold">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-500">
                  <Palette className="h-4 w-4" />
                </div>
                {t('app.appearance', { defaultValue: 'Appearance' })}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="mb-4">
                <p className="text-sm font-medium text-foreground">{t('app.theme', { defaultValue: 'Interface Theme' })}</p>
                <p className="text-xs text-muted-foreground mt-0.5">Select your preferred visual style.</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {THEMES.map(({ value, label, icon: Icon }) => {
                  const isActive = theme === value;
                  return (
                    <button
                      key={value}
                      onClick={() => setTheme(value)}
                      className={cn(
                        'group relative flex flex-col items-start gap-3 rounded-xl border p-4 transition-all duration-200',
                        isActive
                          ? 'border-indigo-500 bg-indigo-500/5 shadow-[0_0_0_1px_rgba(99,102,241,0.2)]'
                          : 'border-border/60 bg-background hover:border-border hover:bg-muted/10'
                      )}
                    >
                      <div className={cn(
                        "flex h-10 w-10 items-center justify-center rounded-full border transition-colors",
                        isActive ? "border-indigo-500/30 bg-indigo-500/10 text-indigo-500" : "border-border/50 bg-muted/20 text-muted-foreground group-hover:text-foreground"
                      )}>
                        <Icon className="h-5 w-5" />
                      </div>

                      <div className="flex w-full items-center justify-between text-left">
                        <span className={cn("text-sm font-medium", isActive ? "text-indigo-500" : "text-foreground")}>
                          {value === 'light' ? t('theme.light') : t('theme.dark')}
                        </span>
                        {isActive && <Check className="h-4 w-4 text-indigo-500" />}
                      </div>
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* 2. Notifications */}
        <motion.div variants={item}>
          <Card className="overflow-hidden border-border/50 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between border-b border-border/50 bg-muted/10 px-6 py-4">
              <CardTitle className="flex items-center gap-3 text-base font-semibold">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/10 text-blue-500">
                  <Bell className="h-4 w-4" />
                </div>
                {t('app.notifications', { defaultValue: 'Notifications' })}
              </CardTitle>
              {/* Indicador de autoguardado sutil en la cabecera */}
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium bg-muted px-2 py-1 rounded-md">
                {t('app.autoSaved', { defaultValue: 'Auto-saved' })}
              </span>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-border/40">
                {(
                  [
                    { key: 'taskAssigned' as const, label: t('notification.taskAssigned'), desc: t('notification.taskAssignedDesc') },
                    { key: 'taskDue' as const, label: t('notification.taskDue'), desc: t('notification.taskDueDesc') },
                    { key: 'taskDue1h' as const, label: t('notification.taskDue1h'), desc: t('notification.taskDue1hDesc') },
                    { key: 'projectUpdates' as const, label: t('notification.projectUpdates'), desc: t('notification.projectUpdatesDesc') },
                    { key: 'weekly' as const, label: t('notification.weekly'), desc: t('notification.weeklyDesc') },
                    { key: 'emailNotifications' as const, label: t('notification.emailNotifications'), desc: t('notification.emailNotificationsDesc') },
                    { key: 'realtimeNotifications' as const, label: t('notification.realtimeNotifications'), desc: t('notification.realtimeNotificationsDesc') },
                  ]
                ).map(({ key, label, desc }) => (
                  <div key={key} className="flex items-center justify-between px-6 py-4 transition-colors hover:bg-muted/5">
                    <div className="pr-4">
                      <p className="text-sm font-medium text-foreground">{label}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      {savingKey === key && <Loader2 className="h-4 w-4 animate-spin text-primary" />}
                      <Toggle
                        checked={prefs.notifications[key]}
                        onChange={(v) => void updateNotificationPref(key, v)}
                      />
                    </div>
                  </div>
                ))}
              </div>

              {!prefsLoaded && (
                <div className="flex items-center justify-center p-6 text-sm text-muted-foreground">
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t('common.loading', { defaultValue: 'Loading preferences...' })}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* 3. Language & Region */}
        <motion.div variants={item}>
          <Card className="overflow-hidden border-border/50 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between border-b border-border/50 bg-muted/10 px-6 py-4">
              <CardTitle className="flex items-center gap-3 text-base font-semibold">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-500/10 text-purple-500">
                  <Globe className="h-4 w-4" />
                </div>
                {t('app.languageRegion', { defaultValue: 'Language & Region' })}
              </CardTitle>
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium bg-muted px-2 py-1 rounded-md">
                {t('app.autoSaved', { defaultValue: 'Auto-saved' })}
              </span>
            </CardHeader>

            <CardContent className="p-6">
              <div className="grid gap-6 sm:grid-cols-2">
                {/* Selector de Idioma */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground ml-1">
                    {t('app.language', { defaultValue: 'Language' })}
                  </label>
                  <div className="relative">
                    <select
                      value={prefs.language}
                      onChange={(e) => prefs.setLanguage(e.target.value)}
                      className="w-full appearance-none rounded-lg border border-border/60 bg-background px-4 py-2.5 text-sm font-medium text-foreground transition-all hover:bg-muted/10 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                    >
                      {LANGUAGES.map(({ value, label }) => (
                        <option key={value} value={value}>{label}</option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground ml-1">
                    {t('app.timezone', { defaultValue: 'Timezone' })}
                  </label>
                  <div className="relative">
                    <select
                      value={prefs.timezone}
                      onChange={(e) => prefs.setTimezone(e.target.value)}
                      className="w-full appearance-none rounded-lg border border-border/60 bg-background px-4 py-2.5 text-sm font-medium text-foreground transition-all hover:bg-muted/10 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                    >
                      {TIMEZONES.map((tz) => (
                        <option key={tz} value={tz}>{tz}</option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>


        {/* Security */}
        <motion.div variants={item}>
          <Card className="overflow-hidden border-border/50 shadow-sm">

            {/* Cabecera Principal */}
            <CardHeader className="border-b border-border/50 bg-muted/10 px-6 py-5">
              <CardTitle className="flex items-center gap-3 text-base font-semibold">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Shield className="h-4 w-4" />
                </div>
                {t('settings.securityTitle', { defaultValue: 'Security & Access' })}
              </CardTitle>
            </CardHeader>

            <CardContent className="p-0">
              <div className="p-6">
                <div className="mb-5">
                  <h4 className="flex items-center gap-2 text-sm font-medium text-foreground">
                    <KeyRound className="h-4 w-4 text-muted-foreground" />
                    {t('settings.changePassword', { defaultValue: 'Change password' })}
                  </h4>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {t('settings.changePasswordDesc', { defaultValue: 'Update your password to keep your account secure.' })}
                  </p>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground ml-1">
                      {t('settings.currentPassword', { defaultValue: 'Current password' })}
                    </label>
                    <input
                      type="password"
                      placeholder="••••••••"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      className="w-full rounded-lg border border-border/60 bg-background/50 px-3 py-2 text-sm transition-all outline-none focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary hover:bg-background"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground ml-1">
                      {t('settings.newPassword', { defaultValue: 'New password' })}
                    </label>
                    <input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full rounded-lg border border-border/60 bg-background/50 px-3 py-2 text-sm transition-all focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary hover:bg-background outline-none"
                    />
                  </div>
                </div>

                <div className="mt-5 flex justify-end">
                  <Button
                    type="button"
                    variant="default"
                    loading={changePassword.isPending}
                    disabled={currentPassword.length < 8 || newPassword.length < 8}
                    onClick={async () => {
                      await changePassword.mutateAsync({ currentPassword, newPassword });
                      setCurrentPassword('');
                      setNewPassword('');
                    }}
                  >
                    {t('settings.updatePassword', { defaultValue: 'Update password' })}
                  </Button>
                </div>
              </div>

              <div className="h-px w-full bg-border/50" /> {/* Separador Sutil */}

              {/* SECCIÓN 2: Sesiones Activas */}
              <div className="bg-muted/5 p-6">
                <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h4 className="text-sm font-medium text-foreground">
                      {t('settings.activeSessions', { defaultValue: 'Active sessions' })}
                    </h4>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {t('settings.sessionsDesc', { defaultValue: 'Manage devices currently logged into your account.' })}
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    className="shrink-0 text-destructive border-destructive/20 hover:bg-destructive/10 hover:text-destructive"
                    loading={logoutAllSessions.isPending}
                    onClick={() => logoutAllSessions.mutate()}
                  >
                    <LogOut className="mr-2 h-3.5 w-3.5" />
                    {t('settings.logoutAllDevices', { defaultValue: 'Log out all devices' })}
                  </Button>
                </div>

                {sessions.isLoading ? (
                  <div className="flex items-center justify-center py-6">
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  </div>
                ) : (
                  <div className="space-y-3">
                    {(sessions.data ?? []).length === 0 ? (
                      <p className="py-4 text-center text-xs text-muted-foreground">
                        {t('settings.noActiveSessions', { defaultValue: 'No active sessions found.' })}
                      </p>
                    ) : (
                      (sessions.data ?? []).map((session) => (
                        <div
                          key={session.id}
                          className="group flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-lg border border-border/50 bg-background p-4 shadow-sm transition-all hover:border-primary/30"
                        >
                          <div className="flex items-start sm:items-center gap-4">
                            {/* Icono de Dispositivo */}
                            <div className="mt-1 sm:mt-0 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-secondary/50 text-muted-foreground transition-colors group-hover:text-foreground">
                              <Monitor className="h-5 w-5" />
                            </div>

                            {/* Información de Sesión */}
                            <div>
                              <div className="flex items-center gap-2">
                                <p className="text-sm font-semibold text-foreground">
                                  {getBrowserLabel(session.userAgent) || t('settings.unknownDevice', { defaultValue: 'Unknown device' })}
                                </p>
                                {session.id === currentSessionId && (
                                  <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-500">
                                    {t('settings.currentSession', { defaultValue: 'Active Now' })}
                                  </span>
                                )}
                              </div>

                              <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                                <span className="flex items-center gap-1">
                                  <MapPin className="h-3 w-3" />
                                  {session.ipAddress || '-'}{session.country ? `, ${session.country}` : ''}
                                </span>
                                <span className="hidden sm:inline text-border">•</span>
                                <span>
                                  {t('settings.lastActivity', { defaultValue: 'Last active' })}: {session.lastUsedAt ? new Date(session.lastUsedAt).toLocaleString() : new Date(session.createdAt).toLocaleString()}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Acción Individual (Cerrar Sesión) */}
                          <div className="flex justify-end shrink-0">
                            {session.id !== currentSessionId && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive h-8 px-3 text-xs"
                                loading={logoutSession.isPending}
                                onClick={() => logoutSession.mutate(session.id)}
                              >
                                {t('settings.logoutSession', { defaultValue: 'Revoke' })}
                              </Button>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>

            </CardContent>
          </Card>
        </motion.div>

      </motion.div>
    </div>
  );
}

function getBrowserLabel(userAgent?: string | null) {
  if (!userAgent) return '';
  const ua = userAgent.toLowerCase();
  if (ua.includes('edg/')) return 'Microsoft Edge';
  if (ua.includes('chrome/') && !ua.includes('edg/')) return 'Google Chrome';
  if (ua.includes('firefox/')) return 'Mozilla Firefox';
  if (ua.includes('safari/') && !ua.includes('chrome/')) return 'Safari';
  if (ua.includes('mobile')) return 'Mobile Browser';
  return userAgent;
}
