import { useState, useCallback } from 'react';
import { useDebounce } from '@/hooks/useDebounce';
import { useUsers, useAddMember, useRemoveMember } from '@/hooks/useUsers';
import { Avatar, AvatarGroup } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { Dialog } from '@/components/ui/Dialog';
import { cn } from '@/utils/cn';
import {
  UserPlus, X, Search, Crown, ShieldCheck, User, Loader2, Users,
  CheckCircle2,
} from 'lucide-react';
import type { ProjectMember } from '@/types/project.types';
import { useTranslation } from 'react-i18next';

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
  onClick?: () => void;
}) {
  const { t } = useTranslation();
  const users = members
    .map((m) => m.user)
    .filter((u): u is NonNullable<ProjectMember['user']> => Boolean(u));

  return (
    <button
      onClick={() => onClick?.()}
      className="group flex items-center gap-3 rounded-2xl border border-border/70 bg-card/80 px-3 py-2 backdrop-blur-sm transition-all duration-200 hover:bg-accent/70"
      title={t('member.manageTeamMembers', { defaultValue: 'Manage team members' })}
    >
      {/* Avatars */}
      <div className="transition-transform duration-200 group-hover:-translate-y-0.5">
        <AvatarGroup
          users={users.map((u) => ({
            id: u.id,
            firstName: u.firstName,
            lastName: u.lastName,
            avatar: (u as any).avatar,
          }))}
          max={5}
          size="sm"
          className="-space-x-2"
        />
      </div>

      {/* Text */}
      <div className="hidden sm:flex flex-col items-start leading-tight">
        <span className="text-sm font-medium text-foreground">
          {t('member.team', { defaultValue: 'Team' })}
        </span>

        <span className="text-[11px] text-muted-foreground">
          {t('member.membersCount', { defaultValue: '{{count}} members', count: members.length })}
        </span>
      </div>

      {/* Icon */}
      <div
        className="hidden md:flex h-8 w-8 items-center justify-center rounded-xl bg-background/70 transition-colors group-hover:bg-accent"
      >
        <Users className="h-4 w-4 text-muted-foreground transition-colors group-hover:text-foreground" />
      </div>
    </button>
  );
}

/** Modal content */
export function MemberManager({ projectId, members, currentUserId, currentRole }: MemberManagerProps) {
  const { t } = useTranslation();
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
  const roleLabel: Record<string, string> = {
    OWNER: t('member.roleOwner', { defaultValue: 'Owner' }),
    ADMIN: t('member.roleAdmin', { defaultValue: 'Admin' }),
    MEMBER: t('member.roleMember', { defaultValue: 'Member' }),
  };

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

      <Dialog open={open} onClose={() => setOpen(false)} title={t('member.teamMembers', { defaultValue: 'Team members' })} className="max-w-md">
        <div className="space-y-4">
          {/* Current members list */}
          <div className="space-y-1.5 max-h-64 overflow-y-auto">
            {members.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">{t('member.noMembersYet', { defaultValue: 'No members yet.' })}</p>
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
                      {isSelf && <span className="text-xs text-muted-foreground ml-1">({t('member.you', { defaultValue: 'you' })})</span>}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">{(m.user as any)?.email}</p>
                  </div>
                  <div className={cn('flex items-center gap-1 text-xs font-medium', ROLE_COLOR[m.role])}>
                    <RoleIcon className="h-3 w-3" />
                    {roleLabel[m.role]}
                  </div>
                  {canManage && !isOwner && !isSelf && (
                    <button
                      onClick={() => handleRemove(m.userId)}
                      disabled={isRemoving}
                      className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-destructive/10 text-destructive disabled:cursor-not-allowed"
                      title={t('member.removeMember', { defaultValue: 'Remove member' })}
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
                {t('member.addTeamMember', { defaultValue: 'Add team member' })}
              </h4>

              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                <input
                  type="text"
                  placeholder={t('member.searchByNameOrEmail', { defaultValue: 'Search by name or email…' })}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring placeholder:text-muted-foreground"
                />
              </div>

              {/* Results */}
              <div className="max-h-48 overflow-y-auto space-y-1">
                {!debouncedSearch && (
                  <p className="text-xs text-muted-foreground text-center py-3">
                    {t('member.typeNameOrEmail', { defaultValue: 'Type a name or email to search users' })}
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
                    {t('member.noUsersFound', { defaultValue: 'No users found. They may already be a member.' })}
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
