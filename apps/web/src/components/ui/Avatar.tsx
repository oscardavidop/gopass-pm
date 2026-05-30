import * as React from 'react';
import * as AvatarPrimitive from '@radix-ui/react-avatar';
import { cn } from '@/utils/cn';

const SIZES = {
  xs: 'h-5 w-5 text-[9px]',
  sm: 'h-7 w-7 text-[11px]',
  md: 'h-8 w-8 text-xs',
  lg: 'h-10 w-10 text-sm',
  xl: 'h-12 w-12 text-base',
  '2xl': 'h-16 w-16 text-lg',
};

type AvatarSize = keyof typeof SIZES;

interface AvatarProps {
  src?: string | null;
  firstName?: string;
  lastName?: string;
  size?: AvatarSize;
  className?: string;
  /** Show green online indicator dot */
  online?: boolean;
  /** Custom fallback color — defaults to indigo palette based on initials */
  color?: string;
}

function getInitials(firstName?: string, lastName?: string): string {
  const f = (firstName?.[0] ?? '').toUpperCase();
  const l = (lastName?.[0] ?? '').toUpperCase();
  return f + l || '?';
}

const PALETTE = [
  'bg-indigo-500/20 text-indigo-400',
  'bg-violet-500/20 text-violet-400',
  'bg-blue-500/20 text-blue-400',
  'bg-emerald-500/20 text-emerald-400',
  'bg-pink-500/20 text-pink-400',
  'bg-amber-500/20 text-amber-400',
  'bg-cyan-500/20 text-cyan-400',
  'bg-rose-500/20 text-rose-400',
];

function seedColor(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
  return PALETTE[Math.abs(hash) % PALETTE.length];
}

export function Avatar({
  src,
  firstName,
  lastName,
  size = 'md',
  className,
  online,
}: AvatarProps) {
  const initials = getInitials(firstName, lastName);
  const colorClass = seedColor(initials);

  return (
    <span className={cn('relative inline-flex shrink-0', className)}>
      <AvatarPrimitive.Root className={cn('rounded-full overflow-hidden', SIZES[size])}>
        {src && (
          <AvatarPrimitive.Image
            src={src}
            alt={`${firstName} ${lastName}`}
            className="h-full w-full object-cover"
          />
        )}
        <AvatarPrimitive.Fallback
          className={cn(
            'flex h-full w-full items-center justify-center rounded-full font-semibold',
            colorClass,
          )}
        >
          {initials}
        </AvatarPrimitive.Fallback>
      </AvatarPrimitive.Root>
      {online && (
        <span className="absolute bottom-0 right-0 block h-2 w-2 rounded-full bg-emerald-400" />
      )}
    </span>
  );
}

/** Stack of avatars (AvatarGroup) */
interface AvatarGroupProps {
  users: Array<{ id: string; firstName: string; lastName: string; avatar?: string | null }>;
  max?: number;
  size?: AvatarSize;
  className?: string;
}

export function AvatarGroup({
  users,
  max = 4,
  size = 'sm',
  className,
}: AvatarGroupProps) {
  const visible = users.slice(0, max);
  const rest = users.length - max;

  return (
    <span className={cn('flex items-center -space-x-2', className)}>
      {visible.map((u) => (
        <Avatar
          key={u.id}
          src={u.avatar}
          firstName={u.firstName}
          lastName={u.lastName}
          size={size}
        />
      ))}

      {rest > 0 && (
        <span
          className={cn(
            'flex items-center justify-center rounded-full',
            'bg-muted text-muted-foreground font-medium',
            SIZES[size],
          )}
        >
          +{rest}
        </span>
      )}
    </span>
  );
}
