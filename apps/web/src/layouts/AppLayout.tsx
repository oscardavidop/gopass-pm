import { Outlet } from 'react-router-dom';
import { Sidebar } from '@/components/shared/Sidebar';
import { Navbar } from '@/components/shared/Navbar';
import { useUIStore } from '@/store/ui.store';
import { cn } from '@/utils/cn';

export function AppLayout() {
  const sidebarCollapsed = useUIStore((s) => s.sidebarCollapsed);

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar />
      <div
        className={cn(
          'flex flex-col flex-1 overflow-hidden transition-[margin] duration-200',
          sidebarCollapsed ? 'ml-16' : 'ml-60',
        )}
      >
        <Navbar />
        <main className="flex-1 overflow-y-auto">
          <div className="container mx-auto px-6 py-6 max-w-screen-xl">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
