import { Github } from 'lucide-react';
import toast from 'react-hot-toast';
import { Button } from '@/components/ui/Button';
import { useOAuthLogin } from '@/hooks/useAuth';
import type { OAuthProvider } from '@/services/auth.service';

function buildOAuthUrl(provider: OAuthProvider, redirectUri: string, state: string) {
  if (provider === 'google') {
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    const scope = encodeURIComponent('openid email profile');
    return `https://accounts.google.com/o/oauth2/v2/auth?client_id=${encodeURIComponent(clientId)}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${scope}&access_type=offline&prompt=consent&state=${encodeURIComponent(state)}`;
  }

  if (provider === 'github') {
    const clientId = import.meta.env.VITE_GITHUB_CLIENT_ID;
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

export function SocialAuthButtons({ className = '' }: SocialAuthButtonsProps) {
  const oauth = useOAuthLogin();

  const startOAuth = (provider: OAuthProvider) => {
    if (provider === 'google' && !import.meta.env.VITE_GOOGLE_CLIENT_ID) {
      return;
    }
    if (provider === 'github' && !import.meta.env.VITE_GITHUB_CLIENT_ID) {
      return;
    }

    const state = crypto.randomUUID();
    const appUrl = import.meta.env.VITE_APP_URL || window.location.origin;
    const redirectUri = `${appUrl}/auth/oauth/callback?provider=${provider}`;
    const authUrl = buildOAuthUrl(provider, redirectUri, state);

    sessionStorage.setItem('tasku_oauth_state', state);
    sessionStorage.setItem('tasku_oauth_provider', provider);
    sessionStorage.setItem('tasku_oauth_redirect_uri', redirectUri);

    const popup = window.open(authUrl, 'tasku_oauth', 'width=520,height=720');
    if (!popup) {
      toast.error('Enable popups to continue with social sign in.');
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
        toast.error(data.errorDescription || data.error || 'Could not sign in with provider');
        return;
      }

      oauth.mutate({ provider, code: data.code, redirectUri, state: data.state });
    };

    window.addEventListener('message', listener);
  };

  const isGoogleEnabled = !!import.meta.env.VITE_GOOGLE_CLIENT_ID;
  const isGithubEnabled = !!import.meta.env.VITE_GITHUB_CLIENT_ID;

  return (
    <div className={`space-y-2 ${className}`}>
      <Button
        type="button"
        variant="outline"
        className="w-full justify-center"
        onClick={() => startOAuth('google')}
        disabled={!isGoogleEnabled || oauth.isPending}
      >
        <GoogleGlyph />
        Continue with Google
      </Button>

      <Button
        type="button"
        variant="outline"
        className="w-full justify-center"
        onClick={() => startOAuth('github')}
        disabled={!isGithubEnabled || oauth.isPending}
      >
        <Github className="h-4 w-4" />
        Continue with GitHub
      </Button>
    </div>
  );
}
