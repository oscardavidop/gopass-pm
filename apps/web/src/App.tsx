import { BrowserRouter } from 'react-router-dom';
import { AppRoutes } from '@/routes';
import { useThemeInit } from '@/hooks/useTheme';
import { useAuthSessionManager } from '@/hooks/useAuthSessionManager';

export default function App() {
  useThemeInit();
  useAuthSessionManager();
  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <AppRoutes />
    </BrowserRouter>
  );
}
