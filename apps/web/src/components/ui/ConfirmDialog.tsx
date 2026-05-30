/**
 * ConfirmDialog — replaces window.confirm with a proper modal.
 */
import * as React from 'react';
import * as AlertDialogPrimitive from '@radix-ui/react-alert-dialog';
import { AlertTriangle, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from './Button';
import { cn } from '@/utils/cn';

interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'destructive' | 'default';
  isLoading?: boolean;
  onConfirm: () => void;
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  cancelLabel,
  variant = 'destructive',
  isLoading,
  onConfirm,
}: ConfirmDialogProps) {
  const { t } = useTranslation();
  return (
    <AlertDialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <AlertDialogPrimitive.Portal>
        <AlertDialogPrimitive.Overlay
          className={cn(
            'fixed inset-0 z-50 bg-background/50 backdrop-blur-sm',
            'data-[state=open]:animate-fade-in',
          )}
        />
        <AlertDialogPrimitive.Content
       className={cn(
  'fixed left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2',
  'w-full max-w-md rounded-xl border border-border bg-card shadow-xl p-6',
  'data-[state=open]:animate-scale-in'
)}

        >
          <div className="flex gap-4">
            {variant === 'destructive' && (
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-destructive/10">
                <AlertTriangle className="h-5 w-5 text-destructive" />
              </div>
            )}
            <div className="flex-1">
              <AlertDialogPrimitive.Title className="text-base font-semibold">
                {title}
              </AlertDialogPrimitive.Title>
              {description && (
                <AlertDialogPrimitive.Description className="mt-1.5 text-sm text-muted-foreground">
                  {description}
                </AlertDialogPrimitive.Description>
              )}
            </div>
          </div>

          <div className="mt-6 flex justify-end gap-3">
            <AlertDialogPrimitive.Cancel asChild>
              <Button variant="outline" size="sm" disabled={isLoading}>
                {cancelLabel || t('common.cancel')}
              </Button>
            </AlertDialogPrimitive.Cancel>
            <AlertDialogPrimitive.Action asChild>
              <Button
                variant={variant === 'destructive' ? 'destructive' : 'default'}
                size="sm"
                isLoading={isLoading}
                onClick={onConfirm}
              >
                {variant === 'destructive' && <Trash2 className="h-3.5 w-3.5 mr-1.5" />}
                {confirmLabel || t('common.confirm', { defaultValue: 'Confirm' })}
              </Button>
            </AlertDialogPrimitive.Action>
          </div>
        </AlertDialogPrimitive.Content>
      </AlertDialogPrimitive.Portal>
    </AlertDialogPrimitive.Root>
  );
}
