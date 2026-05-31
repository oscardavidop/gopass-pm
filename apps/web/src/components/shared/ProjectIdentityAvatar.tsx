import { ImagePlus } from 'lucide-react';

import { cn } from '@/utils/cn';
import { resolveApiAssetUrl } from '@/utils/url';

interface ProjectIdentityAvatarProps {
  name: string;
  color?: string | null;
  iconUrl?: string | null;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  editable?: boolean;
  uploading?: boolean;
  onClick?: () => void;
  className?: string;
  overlayText?: string;
}

const SIZE_CLASS = {
  xs: 'h-6 w-6 text-[10px]',
  sm: 'h-8 w-8 text-xs',
  md: 'h-10 w-10 text-sm',
  lg: 'h-14 w-14 text-base',
  xl: 'h-20 w-20 text-lg',
} as const;

export function ProjectIdentityAvatar({
  name,
  color,
  iconUrl,
  size = 'md',
  editable,
  uploading,
  onClick,
  className,
  overlayText,
}: ProjectIdentityAvatarProps) {
  const initial = (name || 'P').trim().charAt(0).toUpperCase() || 'P';
  const resolved = iconUrl ? resolveApiAssetUrl(iconUrl) : null;

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!editable || uploading}
      className={cn(
        'group relative overflow-hidden rounded-xl border border-border/60 shadow-sm transition-all',
        editable ? 'cursor-pointer hover:shadow-md' : 'cursor-default',
        SIZE_CLASS[size],
        className,
      )}
      style={!resolved ? { background: color ?? '#6366f1' } : undefined}
      aria-label={overlayText || 'project icon'}
    >
      {resolved ? (
        <img src={resolved} alt={name} className="h-full w-full object-cover" />
      ) : (
        <span className="inline-flex h-full w-full items-center justify-center font-semibold text-white">
          {initial}
        </span>
      )}

      {editable && (
        <span className="pointer-events-none absolute inset-0 flex items-center justify-center gap-1 bg-black/55 text-[10px] font-medium text-white opacity-0 transition-opacity group-hover:opacity-100">
          <ImagePlus className="h-3 w-3" />
          {uploading ? '...' : overlayText}
        </span>
      )}
    </button>
  );
}
