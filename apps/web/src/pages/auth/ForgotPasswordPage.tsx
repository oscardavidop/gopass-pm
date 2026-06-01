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
        <CardTitle>{t('auth.forgotPasswordTitle')}</CardTitle>
        <p className="text-sm text-muted-foreground">{t('auth.forgotPasswordDesc')}</p>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit((data) => mutate(data.email))} className="space-y-4">
          <Input
            label={t('auth.workEmail')}
            type="email"
            placeholder={t('auth.workEmailPlaceholder', { defaultValue: 'you@company.com' })}
            icon={<Mail />}
            error={errors.email?.message ? translateByKey(errors.email.message, undefined, errors.email.message) : undefined}
            {...register('email')}
          />
          <Button type="submit" className="w-full" isLoading={isPending}>
            {t('auth.sendResetLink')}
          </Button>
        </form>

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
