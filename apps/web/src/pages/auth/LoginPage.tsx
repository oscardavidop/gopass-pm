import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Mail, Lock, Copy, Check, ShieldCheck, User, Briefcase, Zap, ChevronUp, ChevronDown } from 'lucide-react';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { useLogin } from '@/hooks/useAuth';
import { SocialAuthButtons } from '@/components/shared/SocialAuthButtons';
import { translateByKey } from '@/i18n/translate';
import { classifyAuthError, getApiErrorMessage } from '@/services/api-error';



export function LoginPage() {
  const { mutate: login, isPending, error } = useLogin();
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const schema = z.object({
    email: z.string().email(t('Invalid email address')),
    password: z.string().min(8, t('Password must be at least 8 characters')),
  });

  type FormData = z.infer<typeof schema>;

  useEffect(() => {
    const oauthError = searchParams.get('oauthError');
    if (!oauthError) return;

    toast.error(oauthError);
    navigate('/login', { replace: true });
  }, [navigate, searchParams]);

  // --- 1. Extraemos 'setValue' de useForm ---
  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  return (
    <Card className="border-border/60 bg-card/90 backdrop-blur-md shadow-xl shadow-primary/5">
      <CardHeader>
        <CardTitle>{t('auth.login.title')}</CardTitle>
        <p className="text-sm text-muted-foreground">{t('auth.login.subtitle')}</p>
      </CardHeader>
      <CardContent>
        <SocialAuthButtons className="mb-4" />
        <div className="relative my-4">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-border/70" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-card px-2 text-muted-foreground tracking-wide">{t('common.orUseEmail')}</span>
          </div>
        </div>

        <form onSubmit={handleSubmit((data) => login(data))} className="space-y-4">
          {classifyAuthError(error) === 'AUTH_INVALID_CREDENTIALS' && (
            <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {getApiErrorMessage(error, 'auth.invalidCredentials', t('auth.invalidCredentials'))}
            </div>
          )}
          <Input
            label={t('auth.email')}
            type="email"
            placeholder={t('auth.emailPlaceholder', { defaultValue: 'you@example.com' })}
            icon={<Mail />}
            error={errors.email?.message ? translateByKey(errors.email.message, undefined, errors.email.message) : undefined}
            {...register('email')}
          />
          <Input
            label={t('auth.password')}
            type="password"
            placeholder={t('auth.passwordPlaceholder', { defaultValue: '••••••••' })}
            icon={<Lock />}
            error={errors.password?.message ? translateByKey(errors.password.message, undefined, errors.password.message) : undefined}
            {...register('password')}
          />
          <Button type="submit" className="w-full" loading={isPending}>
            {t('auth.login.title')}
          </Button>

          <div className="text-right">
            <Link to="/forgot-password" className="text-xs text-muted-foreground hover:text-foreground hover:underline">
              {t('auth.forgotPassword')}
            </Link>
          </div>
        </form>

        <div className="mt-4 text-center text-sm text-muted-foreground">
          {t('auth.noAccount')}{' '}
          <Link to="/register" className="text-primary hover:underline font-medium">
            {t('auth.createAccount')}
          </Link>
        </div>

        {/* --- 2. Modificamos el onAutofill para usar setValue de forma correcta --- */}
        <DemoAccounts
          t={t}
          onAutofill={(email, pass) => {
            setValue('email', email, { shouldValidate: true, shouldDirty: true });
            setValue('password', pass, { shouldValidate: true, shouldDirty: true });
          }}
        />
      </CardContent>
    </Card>
  );
}

// --- Componente DemoAccounts ---
interface DemoAccount {
  email: string;
  pass: string;
  role: 'admin' | 'manager' | 'user';
  labelKey: string;
}

interface DemoAccountsProps {
  t: any;
  onAutofill: (email: string, pass: string) => void;
}


export function DemoAccounts({ t, onAutofill }: DemoAccountsProps) {
  const [isOpen, setIsOpen] = useState(false); // Estado para controlar el colapso
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const accounts: DemoAccount[] = [
    { email: 'admin@tasku.pro', pass: 'Admin123!', role: 'admin', labelKey: 'Admin' },
    { email: 'manager@tasku.pro', pass: 'Manager123!', role: 'manager', labelKey: 'Manager' },
    { email: 'user@tasku.pro', pass: 'User123!', role: 'user', labelKey: 'User' },
  ];

  const handleCopy = async (text: string, identifier: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedField(identifier);
    // toast.success('Copied to clipboard');
    setTimeout(() => setCopiedField(null), 1500);
  };

  const handleAutofill = (account: DemoAccount) => {
    onAutofill(account.email, account.pass);
    // toast.success(`Filled form as ${account.labelKey}`, { icon: '⚡' });
  };

  const getRoleStyle = (role: string) => {
    switch (role) {
      case 'admin': return { icon: ShieldCheck, styles: 'bg-rose-500/10 text-rose-500 border-rose-500/20' };
      case 'manager': return { icon: Briefcase, styles: 'bg-amber-500/10 text-amber-500 border-amber-500/20' };
      default: return { icon: User, styles: 'bg-blue-500/10 text-blue-500 border-blue-500/20' };
    }
  };

  return (
    <div className="mt-4 rounded-xl border border-border/60 bg-muted/30 p-4 transition-all duration-200">
      {/* Encabezado accionable / Botón del colapsable */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center justify-between focus:outline-none group/btn"
      >
        <div className="flex flex-col items-start text-left">
          <p className="text-xs font-semibold tracking-wide text-foreground uppercase flex items-center gap-1.5">
            {t('common.demoAccounts', { defaultValue: 'Quick Access Demo Accounts' })}
            {isOpen ? (
              <ChevronUp className="h-3.5 w-3.5 text-muted-foreground transition-transform" />
            ) : (
              <ChevronDown className="h-3.5 w-3.5 text-muted-foreground transition-transform" />
            )}
          </p>
          {!isOpen && (
            <span className="text-[10px] text-muted-foreground/70 font-medium mt-0.5">
              Click to expand demo accounts
            </span>
          )}
        </div>
        {isOpen && (
          <span className="text-[10px] text-muted-foreground/70 font-medium self-start pt-0.5">
            Click ⚡ to instant login
          </span>
        )}
      </button>

      {/* Contenedor de la lista animado */}
      <div
        className={`grid transition-all duration-300 ease-in-out ${
          isOpen ? 'grid-rows-[1fr] opacity-100 mt-3' : 'grid-rows-[0fr] opacity-0 pointer-events-none'
        }`}
      >
        <div className="overflow-hidden space-y-2">
          {accounts.map((account) => {
            const { icon: RoleIcon, styles } = getRoleStyle(account.role);
            const copyId = `${account.role}-comb`;

            return (
              <div
                key={account.email}
                className="group flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-2.5 rounded-lg border border-border/40 bg-background/60 hover:bg-background hover:border-border/80 transition-all shadow-sm"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md border ${styles}`}>
                    <RoleIcon className="h-3.5 w-3.5" />
                  </div>
                  <div className="min-w-0 font-mono text-[11px] leading-relaxed">
                    <span className="text-foreground font-medium block truncate">{account.email}</span>
                    <span className="text-muted-foreground block truncate">{account.pass}</span>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-1.5 shrink-0 pt-2 sm:pt-0 border-t sm:border-0 border-border/40">
                  <Button
                    variant="ghost"
                    type="button"
                    size="sm"
                    className="h-7 px-2 text-muted-foreground hover:text-foreground hover:bg-muted"
                    onClick={() => handleCopy(`${account.email} / ${account.pass}`, copyId)}
                    title="Copy full credentials"
                  >
                    {copiedField === copyId ? (
                      <Check className="h-3 w-3 text-emerald-500" />
                    ) : (
                      <Copy className="h-3 w-3" />
                    )}
                    <span className="text-[10px] ml-1 sm:hidden md:inline">Copy</span>
                  </Button>

                  <Button
                    variant="outline"
                    type="button"
                    size="sm"
                    className="h-7 px-2.5 text-primary hover:bg-primary/5 hover:text-primary border-primary/20 bg-primary/5"
                    onClick={() => handleAutofill(account)}
                    title="Autofill form"
                  >
                    <Zap className="h-3 w-3 fill-current shrink-0 mr-1" />
                    <span className="text-[10px] font-semibold">Autofill</span>
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}