import { motion } from 'framer-motion';
import { cn } from '@/utils/cn';
import { Button } from '@/components/ui/Button';

interface EmptyStateAction {
  label: string;
  onClick: () => void;
  icon?: React.ReactNode;
}

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  /** @deprecated Pass action/secondaryAction objects for full button support */
  action?: React.ReactNode;
  primaryAction?: EmptyStateAction;
  secondaryAction?: EmptyStateAction;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

const SIZE = {
  sm: { container: 'py-8', iconBox: 'w-10 h-10 rounded-xl', title: 'text-sm', desc: 'text-xs' },
  md: { container: 'py-16', iconBox: 'w-14 h-14 rounded-2xl', title: 'text-base', desc: 'text-sm' },
  lg: { container: 'py-24', iconBox: 'w-20 h-20 rounded-3xl', title: 'text-lg',  desc: 'text-sm' },
};

export function EmptyState({
  icon,
  title,
  description,
  action,
  primaryAction,
  secondaryAction,
  className,
  size = 'md',
}: EmptyStateProps) {
  const s = SIZE[size];

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, ease: 'easeOut' }}
      className={cn(
        'flex flex-col items-center justify-center text-center',
        s.container,
        className,
      )}
    >
      {icon && (
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.08, duration: 0.25, type: 'spring', stiffness: 200 }}
          className={cn(
            'flex items-center justify-center bg-accent/60 text-muted-foreground mb-5 shrink-0',
            s.iconBox,
          )}
        >
          {icon}
        </motion.div>
      )}

      <h3 className={cn('font-semibold text-foreground mb-1.5', s.title)}>{title}</h3>

      {description && (
        <p className={cn('text-muted-foreground max-w-xs leading-relaxed', s.desc)}>
          {description}
        </p>
      )}

      {/* Legacy slot */}
      {action && !primaryAction && <div className="mt-5">{action}</div>}

      {/* Typed action buttons */}
      {(primaryAction || secondaryAction) && (
        <div className="flex items-center gap-3 mt-6">
          {primaryAction && (
            <Button size="sm" onClick={primaryAction.onClick}>
              {primaryAction.icon && <span className="mr-1.5">{primaryAction.icon}</span>}
              {primaryAction.label}
            </Button>
          )}
          {secondaryAction && (
            <Button size="sm" variant="outline" onClick={secondaryAction.onClick}>
              {secondaryAction.label}
            </Button>
          )}
        </div>
      )}
    </motion.div>
  );
}
