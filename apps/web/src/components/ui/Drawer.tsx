/**
 * Drawer — slide-from-right panel using Radix Dialog primitives.
 * Supports sm / md / lg / xl / full widths.
 */
import * as React from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { cn } from '@/utils/cn';

const DrawerRoot = DialogPrimitive.Root;
const DrawerTrigger = DialogPrimitive.Trigger;
const DrawerClose = DialogPrimitive.Close;
const DrawerPortal = DialogPrimitive.Portal;

const SIZES = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
  '2xl': 'max-w-2xl',
  full: 'max-w-full',
};

interface DrawerContentProps extends React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> {
  size?: keyof typeof SIZES;
  /** Hide the default close (X) button */
  hideClose?: boolean;
}

const DrawerOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn(
      'fixed inset-0 z-50 bg-background/40 backdrop-blur-sm',
      'data-[state=open]:animate-fade-in data-[state=closed]:animate-fade-in [&[data-state=closed]]:opacity-0',
      'transition-opacity duration-300',
      className,
    )}
    {...props}
  />
));
DrawerOverlay.displayName = 'DrawerOverlay';

const DrawerContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  DrawerContentProps
>(({ className, children, size = 'lg', hideClose = false, ...props }, ref) => (
  <DrawerPortal>
    <DrawerOverlay />
    <DialogPrimitive.Content
      ref={ref}
      className={cn(
        'fixed inset-y-0 right-0 z-50 flex flex-col bg-card shadow-xl',
        'border-l border-border',
        'w-full',
        SIZES[size],
        // Open animation
        'data-[state=open]:animate-slide-in-right',
        // Close animation via CSS
        'data-[state=closed]:translate-x-full transition-transform duration-300 ease-in',
        className,
      )}
      // style={{ margin: 0 }} // Override Radix's default margin
      {...props}
    >
      {children}
      {!hideClose && (
        <DrawerClose className={cn(
          'absolute right-4 top-4 z-10',
          'h-7 w-7 rounded-md flex items-center justify-center',
          'text-muted-foreground hover:text-foreground',
          'hover:bg-accent transition-colors',
          'focus-ring',
        )}>
          <X className="h-4 w-4" />
          <span className="sr-only">Close</span>
        </DrawerClose>
      )}
    </DialogPrimitive.Content>
  </DrawerPortal>
));
DrawerContent.displayName = 'DrawerContent';

function DrawerHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'flex flex-col gap-1 px-6 py-5 border-b border-border shrink-0',
        className,
      )}
      {...props}
    />
  );
}

function DrawerTitle({ className, ...props }: React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>) {
  return (
    <DialogPrimitive.Title
      className={cn('text-lg font-semibold leading-none tracking-tight', className)}
      {...props}
    />
  );
}

function DrawerDescription({ className, ...props }: React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>) {
  return (
    <DialogPrimitive.Description
      className={cn('text-sm text-muted-foreground mt-1', className)}
      {...props}
    />
  );
}

function DrawerBody({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('flex-1 overflow-y-auto px-6 py-5', className)}
      {...props}
    />
  );
}

function DrawerFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'flex items-center justify-end gap-3 px-6 py-4 border-t border-border shrink-0 bg-card',
        className,
      )}
      {...props}
    />
  );
}

export {
  DrawerRoot,
  DrawerTrigger,
  DrawerClose,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerBody,
  DrawerFooter,
};
