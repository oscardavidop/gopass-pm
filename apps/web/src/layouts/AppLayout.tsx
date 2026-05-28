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
