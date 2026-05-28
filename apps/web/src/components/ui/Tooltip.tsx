import * as React from 'react';
import * as TooltipPrimitive from '@radix-ui/react-tooltip';
import { cn } from '@/utils/cn';

const TooltipProvider = TooltipPrimitive.Provider;
const TooltipRoot = TooltipPrimitive.Root;
const TooltipTrigger = TooltipPrimitive.Trigger;

const TooltipContent = React.forwardRef<
  React.ElementRef<typeof TooltipPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Content>
>(({ className, sideOffset = 6, ...props }, ref) => (
  <TooltipPrimitive.Portal>
    <TooltipPrimitive.Content
      ref={ref}
      sideOffset={sideOffset}
      className={cn(
        'z-50 overflow-hidden rounded-md px-2.5 py-1.5',
        'bg-popover border border-border text-popover-foreground',
        'text-xs font-medium shadow-md',
        'animate-scale-in',
        className,
      )}
      {...props}
    />
  </TooltipPrimitive.Portal>
));
TooltipContent.displayName = TooltipPrimitive.Content.displayName;

/** Convenience: wraps trigger + content in a single component */
interface TooltipProps {
  content: React.ReactNode;
  children: React.ReactNode;
  side?: 'top' | 'right' | 'bottom' | 'left';
  align?: 'start' | 'center' | 'end';
  delayDuration?: number;
  className?: string;
}

export function Tooltip({ content, children, side = 'top', align = 'center', delayDuration = 300, className }: TooltipProps) {
  if (!content) return <>{children}</>;
  return (
    <TooltipRoot delayDuration={delayDuration}>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent side={side} align={align} className={className}>
        {content}
      </TooltipContent>
    </TooltipRoot>
  );
}

export { TooltipProvider, TooltipRoot, TooltipTrigger, TooltipContent };
