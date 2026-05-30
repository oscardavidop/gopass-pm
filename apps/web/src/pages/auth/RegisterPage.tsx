import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Mail, Lock, User, AtSign } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { useRegister } from '@/hooks/useAuth';
import { SocialAuthButtons } from '@/components/shared/SocialAuthButtons';
import { translateByKey } from '@/i18n/translate';

const schema = z.object({
  firstName: z.string().min(2, 'validation.minLength').max(50),
  lastName: z.string().min(2, 'validation.minLength').max(50),
  username: z.string().min(3, 'validation.minLength').max(30).regex(/^[a-z0-9_]+$/, 'validation.usernamePattern'),
  email: z.string().email('validation.invalidEmail'),
  password: z.string().min(8, 'validation.minLength').max(100),
});

type FormData = z.infer<typeof schema>;

export function RegisterPage() {
  const { t } = useTranslation();
  const { mutate: register, isPending } = useRegister();
  const {
    register: field,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  return (
    <Card className="border-border/60 bg-card/90 backdrop-blur-md shadow-xl shadow-primary/5">
      <CardHeader>
        <CardTitle>{t('auth.createAccountTitle', { defaultValue: 'Create account' })}</CardTitle>
        <p className="text-sm text-muted-foreground">{t('auth.createAccountDesc', { defaultValue: 'Build your workspace in seconds, scale it for years.' })}</p>
      </CardHeader>
      <CardContent>
        <SocialAuthButtons className="mb-4" />
        <div className="relative my-4">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-border/70" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-card px-2 text-muted-foreground tracking-wide">{t('auth.orCreateWithEmail', { defaultValue: 'Or create with email' })}</span>
          </div>
        </div>

        <form onSubmit={handleSubmit((data) => register(data))} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Input
              label={t('profile.firstName', { defaultValue: 'First name' })}
              placeholder="John"
              icon={<User />}
              error={errors.firstName?.message ? translateByKey(errors.firstName.message, undefined, errors.firstName.message) : undefined}
              {...field('firstName')}
            />
            <Input
              label={t('profile.lastName', { defaultValue: 'Last name' })}
              placeholder="Doe"
              error={errors.lastName?.message ? translateByKey(errors.lastName.message, undefined, errors.lastName.message) : undefined}
              {...field('lastName')}
            />
          </div>
          <Input
            label={t('auth.username', { defaultValue: 'Username' })}
            placeholder="john_doe"
            icon={<AtSign />}
            error={errors.username?.message ? translateByKey(errors.username.message, undefined, errors.username.message) : undefined}
            {...field('username')}
          />
          <Input
            label={t('auth.email')}
            type="email"
            placeholder="you@example.com"
            icon={<Mail />}
            error={errors.email?.message ? translateByKey(errors.email.message, undefined, errors.email.message) : undefined}
            {...field('email')}
          />
          <Input
            label={t('auth.password')}
            type="password"
            placeholder="••••••••"
            icon={<Lock />}
            error={errors.password?.message ? translateByKey(errors.password.message, undefined, errors.password.message) : undefined}
            {...field('password')}
          />
          <Button type="submit" className="w-full" loading={isPending}>
            {t('auth.createAccount', { defaultValue: 'Create one' })}
          </Button>
        </form>

        <p className="mt-4 text-center text-sm text-muted-foreground">
          {t('auth.alreadyHaveAccount', { defaultValue: 'Already have an account?' })}{' '}
          <Link to="/login" className="text-primary hover:underline font-medium">
            {t('auth.signIn', { defaultValue: 'Sign in' })}
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
