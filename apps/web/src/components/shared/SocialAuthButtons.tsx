import { Github } from 'lucide-react';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/Button';
import { useOAuthLogin } from '@/hooks/useAuth';
import type { OAuthProvider } from '@/services/auth.service';
import { translateByKey } from '@/i18n/translate';
import { cn } from '@/utils/cn';
import { WEB_ENV } from '@/config/env';

function buildOAuthUrl(provider: OAuthProvider, redirectUri: string, state: string) {
  if (provider === 'google') {
    const clientId = WEB_ENV.googleClientId;
    const scope = encodeURIComponent('openid email profile');
    return `https://accounts.google.com/o/oauth2/v2/auth?client_id=${encodeURIComponent(clientId)}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${scope}&access_type=offline&prompt=consent&state=${encodeURIComponent(state)}`;
  }

  if (provider === 'github') {
    const clientId = WEB_ENV.githubClientId;
    const scope = encodeURIComponent('read:user user:email');
    return `https://github.com/login/oauth/authorize?client_id=${encodeURIComponent(clientId)}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${scope}&state=${encodeURIComponent(state)}`;
  }

  throw new Error(`Provider ${provider} is not implemented in web client`);
}

function GoogleGlyph() {
  return (
    <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-white text-[10px] font-semibold text-[#ea4335] border border-border/70">
      G
    </span>
  );
}

interface SocialAuthButtonsProps {
  className?: string;
}

function GoogleIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 48 48"
      aria-hidden="true"
    >
      <path
        fill="#FFC107"
        d="M43.611 20.083H42V20H24v8h11.303C33.654 32.657 29.225 36 24 36c-6.627 0-12-5.373-12-12S17.373 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.277 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"
      />
      <path
        fill="#FF3D00"
        d="M6.306 14.691l6.571 4.819A11.97 11.97 0 0124 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.277 4 24 4c-7.682 0-14.348 4.337-17.694 10.691z"
      />
      <path
        fill="#4CAF50"
        d="M24 44c5.177 0 9.862-1.977 13.409-5.192l-6.19-5.238C29.146 35.091 26.673 36 24 36c-5.204 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z"
      />
      <path
        fill="#1976D2"
        d="M43.611 20.083H42V20H24v8h11.303a12.048 12.048 0 01-4.084 5.57l.003-.002 6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z"
      />
    </svg>
  );
}

function GithubIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="18"
      height="18"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M12 .5C5.648.5.5 5.648.5 12a11.5 11.5 0 008 10.938c.6.112.82-.262.82-.582 0-.287-.011-1.244-.016-2.256-3.252.707-3.938-1.378-3.938-1.378-.532-1.352-1.298-1.712-1.298-1.712-1.062-.726.08-.711.08-.711 1.174.082 1.792 1.205 1.792 1.205 1.044 1.79 2.739 1.272 3.406.973.105-.756.409-1.273.744-1.565-2.596-.295-5.327-1.298-5.327-5.779 0-1.277.457-2.322 1.205-3.141-.121-.295-.522-1.484.114-3.093 0 0 .982-.314 3.218 1.2A11.17 11.17 0 0112 6.18a11.17 11.17 0 012.93.395c2.236-1.514 3.217-1.2 3.217-1.2.637 1.609.236 2.798.115 3.093.75.819 1.204 1.864 1.204 3.141 0 4.492-2.736 5.48-5.34 5.77.42.36.794 1.096.794 2.21 0 1.596-.014 2.88-.014 3.273 0 .323.216.699.825.58A11.502 11.502 0 0023.5 12C23.5 5.648 18.352.5 12 .5z" />
    </svg>
  );
}

export function SocialAuthButtons({ className = '' }: SocialAuthButtonsProps) {
  const oauth = useOAuthLogin();
  const { t } = useTranslation();

  const startOAuth = (provider: OAuthProvider) => {
    if (provider === 'google' && !WEB_ENV.googleClientId) {
      return;
    }
    if (provider === 'github' && !WEB_ENV.githubClientId) {
      return;
    }

    const state = crypto.randomUUID();
    const appUrl = WEB_ENV.appUrl || window.location.origin;
    const redirectUri = `${appUrl}/auth/oauth/callback`;
    const authUrl = buildOAuthUrl(provider, redirectUri, state);

    sessionStorage.setItem('tasku_oauth_state', state);
    sessionStorage.setItem('tasku_oauth_provider', provider);
    sessionStorage.setItem('tasku_oauth_redirect_uri', redirectUri);

    const popup = window.open(authUrl, 'tasku_oauth', 'width=520,height=720');
    if (!popup) {
      toast.error(translateByKey('auth.oauth.popupBlocked', undefined, 'Enable popups to continue with social sign in.'));
      return;
    }

    const listener = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      const data = event.data;
      if (!data || data.source !== 'tasku-oauth') return;

      const expectedState = sessionStorage.getItem('tasku_oauth_state');
      const expectedProvider = sessionStorage.getItem('tasku_oauth_provider');
      if (expectedState && data.state && data.state !== expectedState) {
        return;
      }
      if (expectedProvider && data.provider && data.provider !== expectedProvider) {
        return;
      }

      window.removeEventListener('message', listener);
      sessionStorage.removeItem('tasku_oauth_state');
      sessionStorage.removeItem('tasku_oauth_provider');
      sessionStorage.removeItem('tasku_oauth_redirect_uri');

      if (data.error || !data.code) {
        toast.error(data.errorDescription || data.error || translateByKey('auth.oauth.failed', undefined, 'Could not sign in with provider'));
        return;
      }

      oauth.mutate({ provider, code: data.code, redirectUri, state: data.state });
    };

    window.addEventListener('message', listener);
  };

  const isGoogleEnabled = !!WEB_ENV.googleClientId;
  const isGithubEnabled = !!WEB_ENV.githubClientId;

  return (
  <div className={cn('space-y-3', className)}>
  {/* Google */}
  <Button
    type="button"
    variant="outline"
    onClick={() => startOAuth('google')}
    disabled={!isGoogleEnabled || oauth.isPending}
    className="
      relative
      h-11
      w-full
      rounded-xl
      border-border/60
      bg-background
      hover:bg-accent/50
      hover:border-border
      transition-all
      duration-200
    "
  >
    <span className="absolute left-4 flex items-center">
      <GoogleIcon />
    </span>

    <span className="font-medium">
      {t('auth.oauth.google', {
        defaultValue: 'Continue with Google',
      })}
    </span>
  </Button>

  {/* GitHub */}
  <Button
    type="button"
    variant="outline"
    onClick={() => startOAuth('github')}
    disabled={!isGithubEnabled || oauth.isPending}
    className="
      relative
      h-11
      w-full
      rounded-xl
      border-border/60
      bg-background
      hover:bg-accent/50
      hover:border-border
      transition-all
      duration-200
    "
  >
    <span className="absolute left-4 flex items-center">
      <GithubIcon />
    </span>

    <span className="font-medium">
      {t('auth.oauth.github', {
        defaultValue: 'Continue with GitHub',
      })}
    </span>
  </Button>
</div>
  );
}
