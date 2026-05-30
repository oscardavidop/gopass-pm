import { zodResolver } from '@hookform/resolvers/zod';
import { Mail } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { useForgotPassword } from '@/hooks/useAuth';
import { translateByKey } from '@/i18n/translate';

const schema = z.object({
  email: z.string().email('validation.invalidEmail'),
});

type FormData = z.infer<typeof schema>;

export function ForgotPasswordPage() {
  const { t } = useTranslation();
  const { mutate, isPending } = useForgotPassword();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  return (
    <Card className="border-border/70 bg-card/90 backdrop-blur-sm">
      <CardHeader>
        <CardTitle>{t('auth.forgotPasswordTitle', { defaultValue: 'Forgot password' })}</CardTitle>
        <p className="text-sm text-muted-foreground">{t('auth.forgotPasswordDesc', { defaultValue: 'Enter your email and we will send a secure reset link.' })}</p>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit((data) => mutate(data.email))} className="space-y-4">
          <Input
            label={t('auth.workEmail', { defaultValue: 'Work email' })}
            type="email"
            placeholder="you@company.com"
            icon={<Mail />}
            error={errors.email?.message ? translateByKey(errors.email.message, undefined, errors.email.message) : undefined}
            {...register('email')}
          />
          <Button type="submit" className="w-full" isLoading={isPending}>
            {t('auth.sendResetLink', { defaultValue: 'Send reset link' })}
          </Button>
        </form>

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
