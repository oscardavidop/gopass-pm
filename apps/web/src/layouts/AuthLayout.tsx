import { Outlet } from 'react-router-dom';

export function AuthLayout() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent pointer-events-none" />
      <div className="relative w-full max-w-md px-4">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-white font-bold text-sm">
              G
            </div>
            <span className="font-semibold text-lg tracking-tight">GoPass PM</span>
          </div>
          <p className="text-muted-foreground text-sm">Project management for modern teams</p>
        </div>
        <Outlet />
      </div>
    </div>
  );
}
