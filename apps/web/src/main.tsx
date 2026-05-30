import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { Toaster } from 'react-hot-toast';

import App from './App';
import './index.css';
import { AppErrorBoundary } from '@/components/shared/AppErrorBoundary';
import { initI18n } from '@/i18n';
import { detectBrowserLocale, normalizeLocale } from '@/i18n/locale';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

async function bootstrap() {
  const savedLocale = typeof window !== 'undefined'
    ? JSON.parse(localStorage.getItem('gopass-preferences') || '{}')?.state?.language
    : undefined;
  await initI18n(normalizeLocale(savedLocale || detectBrowserLocale()));

  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <QueryClientProvider client={queryClient}>
        <AppErrorBoundary>
          <App />
        </AppErrorBoundary>
        <Toaster
          position="bottom-center"
          reverseOrder={false}
          gutter={10}
          containerStyle={{
            bottom: 'max(18px, env(safe-area-inset-bottom))',
            left: '12px',
            right: '12px',
          }}
          toastOptions={{
            duration: 2800,
            className: 'tasku-notch-toast',
            style: {
              maxWidth: 'min(92vw, 560px)',
              width: 'max-content',
              background: 'transparent',
              border: 'none',
              boxShadow: 'none',
              padding: '0',
            },
            success: {
              className: 'tasku-notch-toast tasku-notch-toast--success',
              iconTheme: {
                primary: 'hsl(var(--success))',
                secondary: 'hsl(var(--card))',
              },
            },
            error: {
              className: 'tasku-notch-toast tasku-notch-toast--error',
              iconTheme: {
                primary: 'hsl(var(--destructive))',
                secondary: 'hsl(var(--card))',
              },
            },
          }}
        />
        <ReactQueryDevtools initialIsOpen={false} />
      </QueryClientProvider>
    </React.StrictMode>,
  );
}

bootstrap();
