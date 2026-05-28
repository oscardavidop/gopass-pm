import { BrowserRouter } from 'react-router-dom';
import { AppRoutes } from '@/routes';
import { useThemeInit } from '@/hooks/useTheme';

export default function App() {
  useThemeInit();
  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <AppRoutes />
    </BrowserRouter>
  );
}
