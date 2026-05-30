import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Mail, Lock } from 'lucide-react';
import { useEffect } from 'react';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { useLogin } from '@/hooks/useAuth';
import { SocialAuthButtons } from '@/components/shared/SocialAuthButtons';
import { translateByKey } from '@/i18n/translate';

const schema = z.object({
  email: z.string().email('validation.invalidEmail'),
  password: z.string().min(8, 'validation.minLength'),
});

type FormData = z.infer<typeof schema>;

export function LoginPage() {
  const { mutate: login, isPending } = useLogin();
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  useEffect(() => {
    const oauthError = searchParams.get('oauthError');
    if (!oauthError) return;

    toast.error(oauthError);
    navigate('/login', { replace: true });
  }, [navigate, searchParams]);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  return (
    <Card className="border-border/60 bg-card/90 backdrop-blur-md shadow-xl shadow-primary/5">
      <CardHeader>
        <CardTitle>{t('auth.login.title', { defaultValue: 'Sign in' })}</CardTitle>
        <p className="text-sm text-muted-foreground">{t('auth.login.subtitle', { defaultValue: 'Welcome back. Continue where your team left off.' })}</p>
      </CardHeader>
      <CardContent>
        <SocialAuthButtons className="mb-4" />
        <div className="relative my-4">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-border/70" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-card px-2 text-muted-foreground tracking-wide">Or use email</span>
            
          </div>
        </div>

        <form onSubmit={handleSubmit((data) => login(data))} className="space-y-4">
          <Input
            label={t('auth.email', { defaultValue: 'Email' })}
            type="email"
            placeholder="you@example.com"
            icon={<Mail />}
            error={errors.email?.message ? translateByKey(errors.email.message, undefined, errors.email.message) : undefined}
            {...register('email')}
          />
          <Input
            label={t('auth.password', { defaultValue: 'Password' })}
            type="password"
            placeholder="••••••••"
            icon={<Lock />}
            error={errors.password?.message ? translateByKey(errors.password.message, undefined, errors.password.message) : undefined}
            {...register('password')}
          />
          <Button type="submit" className="w-full" loading={isPending}>
            {t('auth.login.title', { defaultValue: 'Sign in' })}
          </Button>

          <div className="text-right">
            <Link to="/forgot-password" className="text-xs text-muted-foreground hover:text-foreground hover:underline">
              {t('auth.forgotPassword', { defaultValue: 'Forgot your password?' })}
            </Link>
          </div>
        </form>

        <div className="mt-4 text-center text-sm text-muted-foreground">
          {t('auth.noAccount', { defaultValue: "Don't have an account?" })}{' '}
          <Link to="/register" className="text-primary hover:underline font-medium">
            {t('auth.createAccount', { defaultValue: 'Create one' })}
          </Link>
        </div>

        <div className="mt-4 p-3 rounded-md bg-muted/50 text-xs text-muted-foreground space-y-1">
          <p className="font-medium text-foreground">Demo accounts</p>
          <p>admin@tasku.pro / Admin123!</p>
          <p>manager@tasku.pro / Manager123!</p>
          <p>user@tasku.pro / User123!</p>
        </div>
      </CardContent>
    </Card>
  );
}
