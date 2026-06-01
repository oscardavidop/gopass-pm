import { zodResolver } from '@hookform/resolvers/zod';
import { Lock } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Link, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { useResetPassword, useValidateResetPasswordToken } from '@/hooks/useAuth';
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
  const { data: tokenValidation, isLoading: validatingToken } = useValidateResetPasswordToken(token);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  const tokenValid = !!token && tokenValidation?.valid === true;
  const invalidReason = tokenValidation?.reason ?? 'invalid';

  return (
    <Card className="border-border/70 bg-card/90 backdrop-blur-sm">
      <CardHeader>
        <CardTitle>{t('auth.createNewPassword')}</CardTitle>
        <p className="text-sm text-muted-foreground">
          {tokenValid
            ? t('auth.createNewPasswordDesc')
            : t('auth.resetPasswordInvalidLink')}
        </p>
      </CardHeader>
      <CardContent>
        {validatingToken && token ? (
          <p className="inline-flex items-center gap-2 text-sm text-muted-foreground">
            <Lock className="h-4 w-4" />
            {t('auth.validatingResetToken')}
          </p>
        ) : tokenValid ? (
          <form onSubmit={handleSubmit((data) => mutate({ token, newPassword: data.newPassword }))} className="space-y-4">
            <Input
              label={t('auth.newPassword')}
              type="password"
              placeholder={t('auth.passwordPlaceholder', { defaultValue: '••••••••' })}
              icon={<Lock />}
              error={errors.newPassword?.message ? translateByKey(errors.newPassword.message, undefined, errors.newPassword.message) : undefined}
              {...register('newPassword')}
            />
            <Input
              label={t('auth.confirmPassword')}
              type="password"
              placeholder={t('auth.passwordPlaceholder', { defaultValue: '••••••••' })}
              icon={<Lock />}
              error={errors.confirmPassword?.message ? translateByKey(errors.confirmPassword.message, undefined, errors.confirmPassword.message) : undefined}
              {...register('confirmPassword')}
            />

            <Button type="submit" className="w-full" isLoading={isPending}>
              {t('auth.resetPassword')}
            </Button>
          </form>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-destructive">
              {invalidReason === 'used'
                ? t('auth.resetTokenUsed')
                : t('auth.resetTokenMissing')}
            </p>
            <Link to="/forgot-password" className="inline-flex">
              <Button type="button" variant="outline">
                {t('auth.sendResetLink')}
              </Button>
            </Link>
          </div>
        )}

        <p className="mt-4 text-center text-sm text-muted-foreground">
          {t('common.backTo')}{' '}
          <Link to="/login" className="text-primary hover:underline font-medium">
            {t('auth.signIn')}
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
