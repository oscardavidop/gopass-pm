import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/utils/cn';

const buttonVariants = cva(
  [
    'inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium',
    'ring-offset-background transition-all duration-150',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
    'disabled:pointer-events-none disabled:opacity-50',
    'gap-2 select-none',
  ].join(' '),
  {
    variants: {
      variant: {
        default: [
          'gradient-primary text-primary-foreground shadow-sm',
          'hover:opacity-90 hover:shadow-glow-sm active:scale-[0.98]',
        ].join(' '),
        destructive: [
          'bg-destructive text-destructive-foreground shadow-sm',
          'hover:bg-destructive/90 active:scale-[0.98]',
        ].join(' '),
        outline: [
          'border border-input bg-background shadow-sm',
          'hover:bg-accent hover:text-accent-foreground hover:border-border active:scale-[0.98]',
        ].join(' '),
        secondary: [
          'bg-secondary text-secondary-foreground shadow-sm',
          'hover:bg-secondary/80 active:scale-[0.98]',
        ].join(' '),
        ghost: 'hover:bg-accent hover:text-accent-foreground active:scale-[0.98]',
        link: 'text-primary underline-offset-4 hover:underline',
        'ghost-muted': 'text-muted-foreground hover:text-foreground hover:bg-accent active:scale-[0.98]',
      },
      size: {
        default: 'h-9 px-4 py-2',
        sm: 'h-8 rounded-md px-3 text-xs',
        lg: 'h-10 rounded-md px-6',
        xl: 'h-12 rounded-lg px-8 text-base',
        icon: 'h-9 w-9',
        'icon-sm': 'h-7 w-7',
        'icon-xs': 'h-6 w-6 rounded-sm',
      },
    },
    defaultVariants: { variant: 'default', size: 'default' },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  loading?: boolean;
  isLoading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild, loading, isLoading, children, disabled, ...props }, ref) => {
    const resolvedLoading = loading ?? isLoading;
    const Comp = asChild ? Slot : 'button';

    return (
      <Comp
        ref={ref}
        className={cn(buttonVariants({ variant, size }), className)}
        disabled={disabled || resolvedLoading}
        {...props}
      >
        {resolvedLoading && (
          <svg className="animate-spin h-3.5 w-3.5 shrink-0" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
          </svg>
        )}
        {children}
      </Comp>
    );
  },
);
Button.displayName = 'Button';

export { buttonVariants };

