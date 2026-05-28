import { useState } from 'react';
import { motion } from 'framer-motion';
import { Moon, Sun, Bell, Globe, Palette, Check } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useTheme } from '@/hooks/useTheme';
import { cn } from '@/utils/cn';

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

export function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const [notifications, setNotifications] = useState({
    taskAssigned:   true,
    taskDue:        true,
    projectUpdates: false,
    weekly:         true,
  });

  const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.07 } } };
  const item = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } };

  return (
    <div className="max-w-2xl mx-auto space-y-6 page-enter">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Customize your GoPass PM experience.</p>
      </div>

      <motion.div variants={container} initial="hidden" animate="show" className="space-y-5">

        {/* Appearance */}
        <motion.div variants={item}>
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Palette className="h-4 w-4" />
                Appearance
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm font-medium mb-3">Theme</p>
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
                      <span className="text-xs font-medium">{label}</span>
                      {theme === value && <Check className="h-3 w-3" />}
                    </button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Notifications */}
        <motion.div variants={item}>
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Bell className="h-4 w-4" />
                Notifications
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {(
                [
                  { key: 'taskAssigned',   label: 'Task assigned to me',    desc: 'Get notified when a task is assigned to you' },
                  { key: 'taskDue',        label: 'Task due date reminder',  desc: 'Alert 24h before a task is due' },
                  { key: 'projectUpdates', label: 'Project updates',         desc: 'When a project status changes' },
                  { key: 'weekly',         label: 'Weekly digest',           desc: 'Summary of your week every Monday' },
                ] as const
              ).map(({ key, label, desc }) => (
                <div key={key} className="flex items-center justify-between py-1">
                  <div>
                    <p className="text-sm font-medium">{label}</p>
                    <p className="text-xs text-muted-foreground">{desc}</p>
                  </div>
                  <Toggle
                    checked={notifications[key]}
                    onChange={(v) => setNotifications((prev) => ({ ...prev, [key]: v }))}
                  />
                </div>
              ))}
            </CardContent>
          </Card>
        </motion.div>

        {/* Language */}
        <motion.div variants={item}>
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Globe className="h-4 w-4" />
                Language & Region
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Language</label>
                <select className="w-full px-3 py-2 text-sm bg-background/60 border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring">
                  <option value="en">English (US)</option>
                  <option value="es">Español</option>
                  <option value="pt">Português</option>
                  <option value="fr">Français</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Timezone</label>
                <select className="w-full px-3 py-2 text-sm bg-background/60 border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring">
                  <option>UTC-5 (Eastern Time)</option>
                  <option>UTC-6 (Central Time)</option>
                  <option>UTC-7 (Mountain Time)</option>
                  <option>UTC-8 (Pacific Time)</option>
                  <option>UTC+0 (London)</option>
                  <option>UTC+1 (Central Europe)</option>
                </select>
              </div>
              <div className="flex justify-end pt-1">
                <Button size="sm">Save preferences</Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>

      </motion.div>
    </div>
  );
}
