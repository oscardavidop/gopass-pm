import { motion, AnimatePresence } from 'framer-motion';
import { Users } from 'lucide-react';
import { Avatar } from '@/components/ui/Avatar';
import { Tooltip } from '@/components/ui/Tooltip';
import { usePresence } from '@/hooks/usePresence';

interface PresenceAvatarsProps {
  projectId: string;
  members?: Array<{ id: string; firstName: string; lastName: string; avatar?: string | null; collaborationColor?: string | null }>;
}

export function PresenceAvatars({ projectId, members = [] }: PresenceAvatarsProps) {
  const users = usePresence(projectId);

  const byUser = new Map<string, (typeof users)[number]>();
  users.forEach((user) => {
    const existing = byUser.get(user.id);
    if (!existing) byUser.set(user.id, user);
  });

  const uniqueUsers = Array.from(byUser.values());
  const onlineUsers = uniqueUsers.filter((user) => (user.status ?? 'online') === 'online');
  const idleUsers = uniqueUsers.filter((user) => user.status === 'idle');
  const knownMemberIds = new Set(members.map((member) => member.id));
  const offlineUsers = members.filter((member) => !byUser.has(member.id) && knownMemberIds.has(member.id));
  const activeUsers = [...onlineUsers, ...idleUsers];
  const displayUsers = activeUsers.slice(0, 6);
  const namePreview = displayUsers
    .slice(0, 2)
    .map((u) => u.firstName)
    .filter(Boolean)
    .join(', ');
  const hasMoreNames = displayUsers.length > 2;

  if (uniqueUsers.length === 0 && members.length === 0) return null;

  return (
    <div className="flex items-center gap-2.5 rounded-xl border border-border/60 bg-background/50 px-2.5 py-1.5">
      <div className="inline-flex items-center gap-2 rounded-lg border border-border/60 bg-background/70 px-2 py-1 text-[11px] text-muted-foreground">
        <span className="inline-flex items-center gap-1">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
          {onlineUsers.length}
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
          {idleUsers.length}
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/40" />
          {offlineUsers.length}
        </span>
      </div>

      <div className="flex -space-x-2">
        <AnimatePresence>
          {displayUsers.map((u) => (
            <motion.div
              key={u.id}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 20 }}
            >
              <Tooltip content={`${u.firstName} ${u.lastName} • ${u.status === 'idle' ? 'idle' : 'online'}`}>
                <div className="rounded-full">
                  <Avatar
                    src={u.avatar}
                    firstName={u.firstName}
                    lastName={u.lastName}
                    size="xs"
                    color={u.collaborationColor}
                    online={u.status !== 'idle'}
                  />
                </div>
              </Tooltip>
            </motion.div>
          ))}
        </AnimatePresence>

        {activeUsers.length > 6 && (
          <div className="w-6 h-6 rounded-full bg-accent border-2 border-background flex items-center justify-center text-[10px] font-medium text-muted-foreground">
            +{activeUsers.length - 6}
          </div>
        )}
      </div>

      <div className="hidden md:flex items-center gap-1.5 text-[11px] text-muted-foreground">
        <Users className="h-3.5 w-3.5" />
        {namePreview ? <span>{namePreview}</span> : <span>No active viewers</span>}
        {hasMoreNames && <span>+{displayUsers.length - 2}</span>}
      </div>
    </div>
  );
}
