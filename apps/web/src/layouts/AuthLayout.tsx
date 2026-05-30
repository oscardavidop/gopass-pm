import { Outlet } from 'react-router-dom';
import { useTheme } from '@/hooks/useTheme';
import logoLight from '../../assets/img/logo-light.png';
import logoDark from '../../assets/img/logo-dark.png';

export function AuthLayout() {
  const { isDark } = useTheme();

  return (
    <div className="relative min-h-screen overflow-hidden bg-background">
      <div className="absolute inset-0 bg-grid opacity-35 pointer-events-none" />
      <div className="absolute -top-24 -left-20 h-72 w-72 rounded-full bg-primary/20 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -right-16 h-72 w-72 rounded-full bg-cyan-400/20 blur-3xl pointer-events-none" />

      <div className="relative min-h-screen flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-md">
          <div className="text-center mb-7">
            <div className="inline-flex items-center gap-2.5 mb-2 rounded-full border border-border/70 bg-card/60 px-3 py-1.5 backdrop-blur-sm">
              <img src={isDark ? logoDark : logoLight} alt="Tasku" className="h-6 w-6 object-contain" />
              <span className="font-semibold text-sm tracking-tight">Tasku</span>
            </div>
            <p className="text-muted-foreground text-sm">Enterprise project management, built for high-velocity teams</p>
          </div>
          <div className="glass rounded-2xl p-2">
            <Outlet />
          </div>
        </div>
      </div>
    </div>
  );
}
