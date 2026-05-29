import { Outlet, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Sidebar } from '@/components/shared/Sidebar';
import { Navbar } from '@/components/shared/Navbar';
import { CommandPalette } from '@/components/ui/CommandPalette';
import { useUIStore } from '@/store/ui.store';
import { useSocket } from '@/hooks/useSocket';
import { cn } from '@/utils/cn';

function PageTransition({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={location.pathname}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}

export function AppLayout() {
  const sidebarCollapsed = useUIStore((s) => s.sidebarCollapsed);

  // Establish global WebSocket connection
  useSocket();

  return (
    <div className="relative flex h-screen overflow-hidden bg-background app-shell-bg">
      <div className="pointer-events-none absolute inset-0 opacity-70">
        <div className="absolute -top-40 right-[8%] h-80 w-80 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute bottom-0 left-[10%] h-72 w-72 rounded-full bg-cyan-400/10 blur-3xl" />
      </div>

      <Sidebar />
      <div
        className={cn(
          'relative z-10 flex flex-col flex-1 overflow-hidden transition-[margin] duration-200',
          'ml-0 lg:ml-[272px]',
          sidebarCollapsed && 'lg:ml-[72px]',
        )}
      >
        <Navbar />
        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto w-full max-w-[1460px] px-3 py-4 md:px-5 md:py-5 xl:px-7">
            <PageTransition>
              <Outlet />
            </PageTransition>
          </div>
        </main>
      </div>
      <CommandPalette />
    </div>
  );
}
