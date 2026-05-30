import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { translateByKey } from '@/i18n/translate';

export function OAuthCallbackPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();

  useEffect(() => {
    const code = params.get('code');
    const state = params.get('state');
    const error = params.get('error');
    const errorDescription = params.get('error_description');
    const providerRaw = params.get('provider') || new URLSearchParams(window.location.search).get('provider');

    if (window.opener && !window.opener.closed) {
      window.opener.postMessage(
        {
          source: 'tasku-oauth',
          provider: providerRaw?.toLowerCase(),
          code,
          state,
          error,
          errorDescription,
        },
        window.location.origin,
      );
      window.close();
      return;
    }

    const qs = new URLSearchParams();
    if (error) {
      qs.set('oauthError', errorDescription || error || translateByKey('auth.oauth.failed', undefined, 'Social sign in failed'));
    } else {
      qs.set('oauthError', translateByKey('auth.oauth.callbackFailed', undefined, 'OAuth callback must be opened in popup mode. Please retry from login.'));
    }

    navigate(`/login?${qs.toString()}`, { replace: true });
  }, [navigate, params]);

  return (
    <div className="min-h-screen flex items-center justify-center text-sm text-muted-foreground">
      {translateByKey('auth.oauth.finishing', undefined, 'Finishing secure sign in...')}
    </div>
  );
}
