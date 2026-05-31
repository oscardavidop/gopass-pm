import { useEffect, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { MailCheck, Loader2, RefreshCw, CheckCircle2, AlertTriangle } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useResendVerificationEmail, useVerifyEmailToken } from '@/hooks/useAuth';

export function VerifyEmailPage() {
  const { t } = useTranslation();
  const [params] = useSearchParams();
  const token = params.get('token') || '';
  const email = params.get('email') || '';

  const verifyMutation = useVerifyEmailToken(token);
  const resendMutation = useResendVerificationEmail();

  useEffect(() => {
    if (!token) return;
    if (verifyMutation.isPending || verifyMutation.isSuccess || verifyMutation.isError) return;
    verifyMutation.mutate();
  }, [token, verifyMutation]);

  const state = useMemo(() => {
    if (token && verifyMutation.isPending) return 'verifying' as const;
    if (token && verifyMutation.isSuccess) return 'verified' as const;
    if (token && verifyMutation.isError) return 'invalid' as const;
    return 'pending' as const;
  }, [token, verifyMutation.isPending, verifyMutation.isSuccess, verifyMutation.isError]);

  return (
    <Card className="border-border/70 bg-card/90 backdrop-blur-sm">
      <CardHeader>
        <CardTitle>{t('auth.verifyEmailTitle', { defaultValue: 'Verify your email' })}</CardTitle>
        <p className="text-sm text-muted-foreground">
          {state === 'pending' && t('auth.verifyEmailPendingDesc', { defaultValue: 'Check your inbox and click the verification link to continue.' })}
          {state === 'verifying' && t('auth.verifyEmailVerifyingDesc', { defaultValue: 'Verifying your link...' })}
          {state === 'verified' && t('auth.verifyEmailSuccessDesc', { defaultValue: 'Your email is verified. You can sign in now.' })}
          {state === 'invalid' && t('auth.verifyEmailInvalidDesc', { defaultValue: 'Invalid or expired verification link.' })}
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-lg border border-border/70 bg-background/60 p-3 text-sm text-muted-foreground inline-flex w-full items-center gap-2">
          {state === 'pending' && <MailCheck className="h-4 w-4" />}
          {state === 'verifying' && <Loader2 className="h-4 w-4 animate-spin" />}
          {state === 'verified' && <CheckCircle2 className="h-4 w-4 text-emerald-500" />}
          {state === 'invalid' && <AlertTriangle className="h-4 w-4 text-amber-500" />}
          <span className="truncate">
            {email || t('auth.verifyEmailNoAddress', { defaultValue: 'Waiting for verification confirmation.' })}
          </span>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            loading={resendMutation.isPending}
            disabled={!email}
            onClick={() => resendMutation.mutate(email)}
          >
            <RefreshCw className="h-4 w-4" />
            {t('auth.resendVerificationEmail', { defaultValue: 'Resend email' })}
          </Button>

          <Link to="/login" className="inline-flex">
            <Button type="button">
              {t('auth.signIn', { defaultValue: 'Sign in' })}
            </Button>
          </Link>

          <Link to="/register" className="inline-flex">
            <Button type="button" variant="ghost">
              {t('auth.backToRegister', { defaultValue: 'Back to register' })}
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
