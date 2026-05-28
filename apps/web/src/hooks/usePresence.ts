import { useEffect, useState } from 'react';
import { useSocket } from '@/hooks/useSocket';

export interface PresenceUser {
  id: string;
  firstName: string;
  lastName: string;
  avatar?: string | null;
  socketId: string;
}

/**
 * Returns a list of users currently viewing a specific project.
 * The backend broadcasts `presence:update` when someone joins/leaves a project room.
 */
export function usePresence(projectId: string | undefined): PresenceUser[] {
  const [users, setUsers] = useState<PresenceUser[]>([]);
  const socket = useSocket(projectId);

  useEffect(() => {
    if (!socket || !projectId) return;

    socket.emit('presence:join', projectId);

    socket.on('presence:update', (data: PresenceUser[]) => {
      setUsers(data);
    });

    return () => {
      socket.emit('presence:leave', projectId);
      socket.off('presence:update');
    };
  }, [socket, projectId]);

  return users;
}
