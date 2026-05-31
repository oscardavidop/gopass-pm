function requireEnv(name: 'VITE_API_URL' | 'VITE_WS_URL' | 'VITE_APP_URL', fallback?: string) {
  const value = import.meta.env[name];
  if (value && value.trim().length > 0) return value.trim();

  if (import.meta.env.DEV && fallback) return fallback;

  throw new Error(`${name} is required${import.meta.env.DEV ? '' : ' in production builds'}`);
}

export const WEB_ENV = {
  apiUrl: requireEnv('VITE_API_URL', 'http://localhost:3001/api/v1'),
  wsUrl: requireEnv('VITE_WS_URL', 'http://localhost:3001'),
  appUrl: requireEnv('VITE_APP_URL', 'http://localhost:3000'),
  defaultLocale: (import.meta.env.VITE_DEFAULT_LOCALE || 'en').toLowerCase(),
  supportedLocales: (import.meta.env.VITE_SUPPORTED_LOCALES || 'en,es')
    .split(',')
    .map((value: string) => value.trim().toLowerCase())
    .filter(Boolean),
  googleClientId: import.meta.env.VITE_GOOGLE_CLIENT_ID || '',
  githubClientId: import.meta.env.VITE_GITHUB_CLIENT_ID || '',
};