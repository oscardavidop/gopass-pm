import { motion, AnimatePresence } from 'framer-motion';
import { Users } from 'lucide-react';
import { Avatar } from '@/components/ui/Avatar';
import { Tooltip } from '@/components/ui/Tooltip';
import { usePresence } from '@/hooks/usePresence';

interface PresenceAvatarsProps {
  projectId: string;
}

export function PresenceAvatars({ projectId }: PresenceAvatarsProps) {
  const users = usePresence(projectId);

  if (users.length === 0) return null;

  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-1 text-xs text-muted-foreground">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
        <span>{users.length} online</span>
      </div>

      <div className="flex -space-x-2">
        <AnimatePresence>
          {users.slice(0, 6).map((u) => (
            <motion.div
              key={u.socketId}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 20 }}
            >
              <Tooltip content={`${u.firstName} ${u.lastName}`}>
                <div className="ring-2 ring-background rounded-full">
                  <Avatar
                    src={u.avatar}
                    firstName={u.firstName}
                    lastName={u.lastName}
                    size="xs"
                    online
                  />
                </div>
              </Tooltip>
            </motion.div>
          ))}
        </AnimatePresence>

        {users.length > 6 && (
          <div className="w-6 h-6 rounded-full bg-accent border-2 border-background flex items-center justify-center text-[10px] font-medium text-muted-foreground">
            +{users.length - 6}
          </div>
        )}
      </div>
    </div>
  );
}
