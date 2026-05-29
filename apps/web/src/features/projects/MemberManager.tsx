import { useState, useCallback } from 'react';
import { useDebounce } from '@/hooks/useDebounce';
import { useUsers, useAddMember, useRemoveMember } from '@/hooks/useUsers';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { Dialog } from '@/components/ui/Dialog';
import { cn } from '@/utils/cn';
import {
  UserPlus, X, Search, Crown, ShieldCheck, User, Loader2, Users,
  CheckCircle2,
} from 'lucide-react';
import type { ProjectMember } from '@/types/project.types';

const ROLE_ICON: Record<string, typeof User> = {
  OWNER: Crown,
  ADMIN: ShieldCheck,
  MEMBER: User,
};

const ROLE_COLOR: Record<string, string> = {
  OWNER: 'text-amber-400',
  ADMIN: 'text-primary',
  MEMBER: 'text-muted-foreground',
};

const ROLE_LABEL: Record<string, string> = {
  OWNER: 'Owner',
  ADMIN: 'Admin',
  MEMBER: 'Member',
};

interface MemberManagerProps {
  projectId: string;
  members: ProjectMember[];
  currentUserId: string;
  currentRole: string;
}

export function MemberManagerTrigger({
  members,
  onClick,
}: {
  members: ProjectMember[];
  onClick: () => void;
}) {
  const users = members.map((m) => m.user).filter(Boolean);

  return (
    <button
      onClick={onClick}
      className="
        group flex items-center gap-3
        rounded-2xl
        bg-[#0b1220]/80
        px-3 py-2
        hover:bg-[#111827]
        transition-all duration-200
      "
      title="Manage team members"
    >
      {/* Avatars */}
      <div className="flex items-center -space-x-2">
        {users.slice(0, 5).map((u, index) => (
          <div
            key={u!.id}
            style={{ zIndex: users.length - index }}
            className="transition-transform duration-200 group-hover:-translate-y-0.5"
          >
            <Avatar
              src={(u as any).avatar}
              firstName={u!.firstName}
              lastName={u!.lastName}
              size="xs"
              className="
                border-2 border-[#0b1220]
                shadow-sm
              "
            />
          </div>
        ))}

        {users.length > 5 && (
          <div
            className="
              w-7 h-7 rounded-full
              border-2 border-[#0b1220]
              bg-[#1f2937]
              flex items-center justify-center
              text-[11px] font-semibold
              text-gray-300
            "
          >
            +{users.length - 5}
          </div>
        )}
      </div>

      {/* Text */}
      <div className="hidden sm:flex flex-col items-start leading-tight">
        <span className="text-sm font-medium text-white">
          Team
        </span>

        <span className="text-[11px] text-gray-400">
          {members.length} member{members.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Icon */}
      <div
        className="
          hidden md:flex
          items-center justify-center
          w-8 h-8 rounded-xl
          bg-white/5
          group-hover:bg-white/10
          transition-colors
        "
      >
        <Users className="h-4 w-4 text-gray-400 group-hover:text-white transition-colors" />
      </div>
    </button>
  );
}

/** Modal content */
export function MemberManager({ projectId, members, currentUserId, currentRole }: MemberManagerProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [addedId, setAddedId] = useState<string | null>(null);
  const debouncedSearch = useDebounce(search, 300);

  const { data: allUsers = [], isLoading: usersLoading } = useUsers(
    open && debouncedSearch.length >= 1 ? debouncedSearch : undefined,
  );

  const addMember = useAddMember(projectId);
  const removeMember = useRemoveMember(projectId);

  const memberIds = new Set(members.map((m) => m.userId));
  const canManage = currentRole === 'OWNER' || currentRole === 'ADMIN';
  const eligibleUsers = allUsers.filter((u) => !memberIds.has(u.id));

  const handleAdd = useCallback(
    (userId: string) => {
      setAddedId(userId);
      addMember.mutate(userId, {
        onSettled: () => {
          setAddedId(null);
          setSearch('');
        },
      });
    },
    [addMember],
  );

  const handleRemove = useCallback(
    (userId: string) => {
      setRemovingId(userId);
      removeMember.mutate(userId, {
        onSettled: () => setRemovingId(null),
      });
    },
    [removeMember],
  );

  return (
    <>
      <MemberManagerTrigger members={members} onClick={() => setOpen(true)} />

      <Dialog open={open} onClose={() => setOpen(false)} title="Team members" className="max-w-md">
        <div className="space-y-4">
          {/* Current members list */}
          <div className="space-y-1.5 max-h-64 overflow-y-auto">
            {members.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">No members yet.</p>
            )}
            {members.sort((a, b) => {
              // Owners first
              if (a.role === 'OWNER' && b.role !== 'OWNER') return -1;
              if (b.role === 'OWNER' && a.role !== 'OWNER') return 1;
              // Then by name
              const nameA = `${a.user?.firstName ?? ''} ${a.user?.lastName ?? ''}`.trim();
              const nameB = `${b.user?.firstName ?? ''} ${b.user?.lastName ?? ''}`.trim();
              return nameA.localeCompare(nameB);
            }).
            map((m) => {
              const RoleIcon = ROLE_ICON[m.role] ?? User;
              const isRemoving = removingId === m.userId;
              const isSelf = m.userId === currentUserId;
              const isOwner = m.role === 'OWNER';
              return (
                <div
                  key={m.userId}
                  className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-accent/40 transition-colors group"
                >
                  <Avatar
                    src={(m.user as any)?.avatar}
                    firstName={m.user?.firstName ?? ''}
                    lastName={m.user?.lastName ?? ''}
                    size="sm"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {m.user?.firstName} {m.user?.lastName}
                      {isSelf && <span className="text-xs text-muted-foreground ml-1">(you)</span>}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">{(m.user as any)?.email}</p>
                  </div>
                  <div className={cn('flex items-center gap-1 text-xs font-medium', ROLE_COLOR[m.role])}>
                    <RoleIcon className="h-3 w-3" />
                    {ROLE_LABEL[m.role]}
                  </div>
                  {canManage && !isOwner && !isSelf && (
                    <button
                      onClick={() => handleRemove(m.userId)}
                      disabled={isRemoving}
                      className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-destructive/10 text-destructive disabled:cursor-not-allowed"
                      title="Remove member"
                    >
                      {isRemoving ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <X className="h-3.5 w-3.5" />
                      )}
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          {/* Add member section */}
          {canManage && (
            <div className="border-t border-border pt-4 space-y-3">
              <h4 className="text-sm font-semibold flex items-center gap-2">
                <UserPlus className="h-4 w-4" />
                Add team member
              </h4>

              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                <input
                  type="text"
                  placeholder="Search by name or email…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring placeholder:text-muted-foreground"
                />
              </div>

              {/* Results */}
              <div className="max-h-48 overflow-y-auto space-y-1">
                {!debouncedSearch && (
                  <p className="text-xs text-muted-foreground text-center py-3">
                    Type a name or email to search users
                  </p>
                )}
                {debouncedSearch && usersLoading && (
                  <>
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="flex items-center gap-3 px-3 py-2">
                        <Skeleton className="w-8 h-8 rounded-full" />
                        <div className="flex-1 space-y-1">
                          <Skeleton className="h-3.5 w-32" />
                          <Skeleton className="h-3 w-40" />
                        </div>
                      </div>
                    ))}
                  </>
                )}
                {debouncedSearch && !usersLoading && eligibleUsers.length === 0 && (
                  <p className="text-xs text-muted-foreground text-center py-3">
                    No users found. They may already be a member.
                  </p>
                )}
                {eligibleUsers.map((u) => {
                  const isAdding = addedId === u.id && addMember.isPending;
                  const wasAdded = addedId === u.id && addMember.isSuccess;
                  return (
                    <button
                      key={u.id}
                      onClick={() => handleAdd(u.id)}
                      disabled={addMember.isPending}
                      className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-accent/60 transition-colors text-left disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <Avatar
                        src={(u as any).avatar}
                        firstName={u.firstName}
                        lastName={u.lastName}
                        size="sm"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{u.firstName} {u.lastName}</p>
                        <p className="text-xs text-muted-foreground truncate">{(u as any).email}</p>
                      </div>
                      {isAdding ? (
                        <Loader2 className="h-4 w-4 animate-spin text-primary shrink-0" />
                      ) : wasAdded ? (
                        <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                      ) : (
                        <UserPlus className="h-4 w-4 text-muted-foreground shrink-0" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </Dialog>
    </>
  );
}
