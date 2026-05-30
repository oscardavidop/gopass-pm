import { zodResolver } from '@hookform/resolvers/zod';
import { Lock } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Link, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { useResetPassword } from '@/hooks/useAuth';
import { translateByKey } from '@/i18n/translate';

const schema = z.object({
  newPassword: z.string().min(8, 'validation.minLength').max(100),
  confirmPassword: z.string().min(8, 'validation.minLength'),
}).refine((data) => data.newPassword === data.confirmPassword, {
  path: ['confirmPassword'],
  message: 'auth.passwordsDoNotMatch',
});

type FormData = z.infer<typeof schema>;

export function ResetPasswordPage() {
  const { t } = useTranslation();
  const [params] = useSearchParams();
  const token = params.get('token') || '';
  const { mutate, isPending } = useResetPassword();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  return (
    <Card className="border-border/70 bg-card/90 backdrop-blur-sm">
      <CardHeader>
        <CardTitle>{t('auth.createNewPassword', { defaultValue: 'Create new password' })}</CardTitle>
        <p className="text-sm text-muted-foreground">{t('auth.createNewPasswordDesc', { defaultValue: 'Use a strong password you have not used before.' })}</p>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit((data) => mutate({ token, newPassword: data.newPassword }))} className="space-y-4">
          <Input
            label={t('auth.newPassword', { defaultValue: 'New password' })}
            type="password"
            placeholder="••••••••"
            icon={<Lock />}
            error={errors.newPassword?.message ? translateByKey(errors.newPassword.message, undefined, errors.newPassword.message) : undefined}
            {...register('newPassword')}
          />
          <Input
            label={t('auth.confirmPassword', { defaultValue: 'Confirm password' })}
            type="password"
            placeholder="••••••••"
            icon={<Lock />}
            error={errors.confirmPassword?.message ? translateByKey(errors.confirmPassword.message, undefined, errors.confirmPassword.message) : undefined}
            {...register('confirmPassword')}
          />

          <Button type="submit" className="w-full" isLoading={isPending} disabled={!token}>
            {t('auth.resetPassword', { defaultValue: 'Reset password' })}
          </Button>
        </form>

        {!token && (
          <p className="mt-4 text-sm text-destructive">{t('auth.resetTokenMissing', { defaultValue: 'Reset token missing. Request a new password reset link.' })}</p>
        )}

        <p className="mt-4 text-center text-sm text-muted-foreground">
          {t('common.backTo', { defaultValue: 'Back to' })}{' '}
          <Link to="/login" className="text-primary hover:underline font-medium">
            {t('auth.signIn', { defaultValue: 'sign in' })}
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
