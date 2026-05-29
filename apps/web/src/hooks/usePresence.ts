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
  // useSocket now returns state (Socket | null) so this hook re-runs when the
  // socket becomes available (was previously a mutable ref that never triggered re-renders).
  const socket = useSocket(projectId);

  useEffect(() => {
    if (!socket || !projectId) return;

    // Announce that this user is present in the project
    socket.emit('presence:join', projectId);

    const onPresenceUpdate = (data: PresenceUser[]) => setUsers(data);
    socket.on('presence:update', onPresenceUpdate);

    return () => {
      socket.emit('presence:leave', projectId);
      socket.off('presence:update', onPresenceUpdate);
    };
  }, [socket, projectId]);

  return users;
}
