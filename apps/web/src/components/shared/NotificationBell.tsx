import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bell, Check, CheckCheck, X, Trash2,
  PlusSquare, Edit3, AlertTriangle, MessageSquare, FolderKanban,
} from 'lucide-react';
import * as Popover from '@radix-ui/react-popover';
import { useTranslation } from 'react-i18next';
import { useNotificationsStore, type AppNotification } from '@/store/notifications.store';
import { timeAgo } from '@/utils/formatters';
import { cn } from '@/utils/cn';
import { translateByKey } from '@/i18n/translate';

const TYPE_CONFIG: Record<string, { icon: React.ElementType; color: string; bg: string }> = {
  task_created:   { icon: PlusSquare,   color: 'text-indigo-400',  bg: 'bg-indigo-400/10' },
  task_updated:   { icon: Edit3,        color: 'text-blue-400',    bg: 'bg-blue-400/10' },
  task_deleted:   { icon: Trash2,       color: 'text-red-400',     bg: 'bg-red-400/10' },
  task_assigned:  { icon: CheckCheck,   color: 'text-emerald-400', bg: 'bg-emerald-400/10' },
  task_overdue:   { icon: AlertTriangle,color: 'text-orange-400',  bg: 'bg-orange-400/10' },
  comment_added:  { icon: MessageSquare,color: 'text-violet-400',  bg: 'bg-violet-400/10' },
  project_updated:{ icon: FolderKanban, color: 'text-amber-400',   bg: 'bg-amber-400/10' },
  mention:        { icon: MessageSquare,color: 'text-pink-400',    bg: 'bg-pink-400/10' },
};

export function NotificationBell() {
  const { notifications, unread, markRead, markAllRead, dismiss, clearAll } =
    useNotificationsStore();
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const prevUnread = useRef(unread);

  // Pulse bell on new notification
  const [pulse, setPulse] = useState(false);
  useEffect(() => {
    if (unread > prevUnread.current) {
      setPulse(true);
      setTimeout(() => setPulse(false), 600);
    }
    prevUnread.current = unread;
  }, [unread]);

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <button
          className={cn(
            'relative p-2 rounded-lg hover:bg-accent transition-colors',
            pulse && 'animate-[pulse-glow_0.6s_ease-out]',
          )}
          aria-label={t('app.notifications')}
        >
          <Bell className="h-4 w-4 text-muted-foreground" />
          <AnimatePresence>
            {unread > 0 && (
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0 }}
                className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center leading-none"
              >
                {unread > 99 ? '99+' : unread}
              </motion.span>
            )}
          </AnimatePresence>
        </button>
      </Popover.Trigger>

      <Popover.Portal>
        <Popover.Content
          align="end"
          sideOffset={8}
          className="z-50 w-[380px] max-h-[480px] bg-card border border-border rounded-xl shadow-xl overflow-hidden"
        >
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.15 }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <div className="flex items-center gap-2">
                <Bell className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-semibold">{t('app.notifications')}</span>
                {unread > 0 && (
                  <span className="text-xs bg-primary/20 text-primary px-1.5 py-0.5 rounded-full font-medium">
                    {unread}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1">
                {unread > 0 && (
                  <button
                    onClick={markAllRead}
                    className="text-xs text-muted-foreground hover:text-primary transition-colors flex items-center gap-1 px-2 py-1 rounded-md hover:bg-accent"
                  >
                    <Check className="h-3 w-3" />
                    {t('notification.markAllRead', { defaultValue: 'Mark all read' })}
                  </button>
                )}
                {notifications.length > 0 && (
                  <button
                    onClick={clearAll}
                    className="p-1 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                    title={t('notification.clearAll', { defaultValue: 'Clear all' })}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* List */}
            <div className="overflow-y-auto max-h-[380px]">
              <AnimatePresence initial={false}>
                {notifications.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                    <Bell className="h-10 w-10 mb-3 opacity-20" />
                    <p className="text-sm font-medium">{t('notification.emptyTitle', { defaultValue: 'All caught up!' })}</p>
                    <p className="text-xs opacity-60 mt-1">{t('notification.emptyBody', { defaultValue: 'No notifications yet' })}</p>
                  </div>
                ) : (
                  notifications.map((n) => (
                    <NotificationItem
                      key={n.id}
                      notification={n}
                      onRead={() => markRead(n.id)}
                      onDismiss={() => dismiss(n.id)}
                    />
                  ))
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

function NotificationItem({
  notification: n,
  onRead,
  onDismiss,
}: {
  notification: AppNotification;
  onRead: () => void;
  onDismiss: () => void;
}) {
  const { t } = useTranslation();
  const cfg = TYPE_CONFIG[n.type] ?? TYPE_CONFIG.task_updated;
  const Icon = cfg.icon;
  const title = n.i18nKey ? translateByKey(n.i18nKey, n.i18nParams, n.title || n.type) : (n.title || n.type);
  const body = n.body || (n.taskTitle ? t('notification.taskFallbackBody', { defaultValue: '{{task}}', task: n.taskTitle }) : '');

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 12, height: 0 }}
      transition={{ duration: 0.15 }}
      onClick={onRead}
      className={cn(
        'flex gap-3 px-4 py-3 cursor-pointer hover:bg-accent/50 transition-colors group border-b border-border/50 last:border-0',
        !n.read && 'bg-primary/5',
      )}
    >
      <div className={cn('w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5', cfg.bg)}>
        <Icon className={cn('h-3.5 w-3.5', cfg.color)} />
      </div>

      <div className="flex-1 min-w-0">
        <p className={cn('text-sm leading-snug', !n.read && 'font-medium')}>
          {title}
        </p>
        <p className="text-xs text-muted-foreground mt-0.5 truncate">{body}</p>
        <p className="text-xs text-muted-foreground/60 mt-1">{timeAgo(n.createdAt)}</p>
      </div>

      <div className="flex flex-col items-end gap-1 shrink-0">
        {!n.read && (
          <span className="w-2 h-2 rounded-full bg-primary mt-1 shrink-0" />
        )}
        <button
          onClick={(e) => { e.stopPropagation(); onDismiss(); }}
          className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-accent transition-all"
        >
          <X className="h-3 w-3 text-muted-foreground" />
        </button>
      </div>
    </motion.div>
  );
}
