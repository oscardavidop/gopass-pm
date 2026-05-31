import * as React from 'react';
import * as AvatarPrimitive from '@radix-ui/react-avatar';
import { cn } from '@/utils/cn';
import { resolveApiAssetUrl } from '@/utils/url';

const SIZES = {
  xs: 'h-6 w-6 text-[10px]',
  sm: 'h-8 w-8 text-xs',
  md: 'h-10 w-10 text-sm',
  lg: 'h-12 w-12 text-base',
  xl: 'h-14 w-14 text-lg',
  '2xl': 'h-16 w-16 text-xl',
};

type AvatarSize = keyof typeof SIZES;

interface AvatarProps {
  src?: string | null;
  firstName?: string;
  lastName?: string;
  size?: AvatarSize;
  className?: string;
  online?: boolean;
  color?: string | null;
}

// Lógica de iniciales mejorada para evitar undefined
function getInitials(firstName?: string, lastName?: string): string {
  if (!firstName && !lastName) return '?';
  const f = firstName ? firstName.trim()[0].toUpperCase() : '';
  const l = lastName ? lastName.trim()[0].toUpperCase() : '';
  return `${f}${l}`;
}

// Paleta estilo SaaS / Dark Tech
const PALETTE = [
  'bg-blue-600 text-white',
  'bg-indigo-600 text-white',
  'bg-violet-600 text-white',
  'bg-purple-600 text-white',
  'bg-fuchsia-600 text-white',
  'bg-emerald-600 text-white',
  'bg-cyan-600 text-white',
  'bg-rose-600 text-white',
];

function seedColor(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return PALETTE[Math.abs(hash) % PALETTE.length];
}

export function Avatar({
  src,
  firstName,
  lastName,
  size = 'md',
  className,
  online,
  color,
}: AvatarProps) {
  const resolvedSrc = resolveApiAssetUrl(src);
  const initials = getInitials(firstName, lastName);
  const colorClass = color ? '' : seedColor(initials);

  return (
    <span className={cn('relative inline-flex shrink-0', className)}>
      <AvatarPrimitive.Root
        className={cn(
          'relative flex shrink-0 overflow-hidden rounded-full',
          /* El ring-background es vital para el efecto de superposición tipo GitHub */
          'ring-2 ring-background', 
          SIZES[size]
        )}
      >
        {resolvedSrc && (
          <AvatarPrimitive.Image
            src={resolvedSrc}
            alt={`${firstName ?? ''} ${lastName ?? ''}`.trim()}
            className="aspect-square h-full w-full object-cover"
          />
        )}

        <AvatarPrimitive.Fallback
          className={cn(
            'flex h-full w-full items-center justify-center font-medium',
            colorClass
          )}
          style={
            color
              ? {
                  backgroundColor: color,
                  color: '#ffffff',
                }
              : undefined
          }
        >
          {initials}
        </AvatarPrimitive.Fallback>
      </AvatarPrimitive.Root>

      {online && (
        <span
          className={cn(
            'absolute bottom-0 right-0 z-10 block rounded-full bg-emerald-500 ring-2 ring-background',
            /* Escalar el punto verde dependiendo del tamaño del avatar */
            size === 'xs' ? 'h-1.5 w-1.5' :
            size === 'sm' ? 'h-2 w-2' :
            size === 'md' ? 'h-2.5 w-2.5' :
            size === 'lg' ? 'h-3 w-3' :
            size === 'xl' ? 'h-3.5 w-3.5' : 'h-4 w-4'
          )}
        />
      )}
    </span>
  );
}

interface AvatarGroupProps {
  users: Array<{
    id: string;
    firstName: string;
    lastName: string;
    avatar?: string | null;
  }>;
  max?: number;
  size?: AvatarSize;
  className?: string;
}

export function AvatarGroup({
  users,
  max = 5,
  size = 'sm',
  className,
}: AvatarGroupProps) {
  const visible = users.slice(0, max);
  const remaining = users.length - max;

  return (
    <div className={cn('flex items-center', className)}>
      {visible.map((user, index) => (
        <div
          key={user.id}
          className="-ml-3 first:ml-0 hover:z-20 transition-transform hover:scale-105"
          style={{
            zIndex: visible.length - index,
          }}
        >
          <Avatar
            src={user.avatar}
            firstName={user.firstName}
            lastName={user.lastName}
            size={size}
            /* Pasamos un className vacío para evitar que el span sobreescriba el ring */
            className="transition-all"
          />
        </div>
      ))}

      {remaining > 0 && (
        <div
          className={cn(
            'relative -ml-3 flex items-center justify-center rounded-full',
            'ring-2 ring-background bg-slate-800 text-slate-300 dark:bg-slate-800 dark:text-slate-300',
            'font-medium shadow-sm z-0',
            SIZES[size]
          )}
        >
          +{remaining}
        </div>
      )}
    </div>
  );
}