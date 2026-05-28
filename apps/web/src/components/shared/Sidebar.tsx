import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  FolderKanban,
  Settings,
  ChevronLeft,
  ChevronRight,
  PanelLeft,
  LogOut,
  User,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/utils/cn';
import { useUIStore } from '@/store/ui.store';
import { useAuthStore } from '@/store/auth.store';
import { useLogout } from '@/hooks/useAuth';
import { Avatar } from '@/components/ui/Avatar';
import { Tooltip } from '@/components/ui/Tooltip';
import { TooltipProvider } from '@/components/ui/Tooltip';

const navItems = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Projects', href: '/projects', icon: FolderKanban },
  { label: 'Settings', href: '/settings', icon: Settings },
];

export function Sidebar() {
  const { sidebarCollapsed, toggleSidebar } = useUIStore();
  const location = useLocation();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const { mutate: logout } = useLogout();

  return (
    <TooltipProvider delayDuration={0}>
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-40 flex flex-col',
          'border-r border-border bg-card',
          'transition-all duration-200 ease-spring',
          sidebarCollapsed ? 'w-16' : 'w-60',
        )}
      >
        {/* Logo */}
        <div
          className={cn(
            'flex items-center h-14 border-b border-border px-4',
            sidebarCollapsed ? 'justify-center px-0' : 'gap-2.5',
          )}
        >
          <div className="w-7 h-7 rounded-lg gradient-primary shadow-glow-sm flex items-center justify-center text-white font-bold text-xs shrink-0 select-none">
            G
          </div>
          <AnimatePresence>
            {!sidebarCollapsed && (
              <motion.div
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -6 }}
                transition={{ duration: 0.15 }}
                className="flex flex-col leading-none"
              >
                <span className="font-semibold text-sm tracking-tight">GoPass PM</span>
                <span className="text-[10px] text-muted-foreground mt-0.5">Project manager</span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Nav */}
        <nav className="flex-1 py-4 px-2 space-y-0.5 overflow-y-auto">
          {navItems.map(({ label, href, icon: Icon }) => {
            const active = location.pathname.startsWith(href);
            const link = (
              <Link
                key={href}
                to={href}
                className={cn(
                  'relative flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium',
                  'transition-all duration-150 group',
                  active
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:bg-accent hover:text-foreground',
                  sidebarCollapsed && 'justify-center px-0',
                )}
              >
                {/* Active indicator */}
                {active && (
                  <motion.span
                    layoutId="sidebar-active"
                    className="absolute inset-y-0 left-0 w-0.5 rounded-r-full bg-primary"
                    transition={{ type: 'spring', stiffness: 400, damping: 40 }}
                  />
                )}

                <Icon
                  className={cn(
                    'h-4 w-4 shrink-0 transition-colors',
                    active ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground',
                  )}
                />
                <AnimatePresence>
                  {!sidebarCollapsed && (
                    <motion.span
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.1 }}
                    >
                      {label}
                    </motion.span>
                  )}
                </AnimatePresence>
              </Link>
            );

            return sidebarCollapsed ? (
              <Tooltip key={href} content={label} side="right">
                {link}
              </Tooltip>
            ) : link;
          })}
        </nav>

        {/* User section */}
        <div className={cn('border-t border-border p-2 space-y-0.5')}>
          {/* Profile link */}
          {sidebarCollapsed ? (
            <Tooltip content={`${user?.firstName} ${user?.lastName}`} side="right">
              <button
                onClick={() => navigate('/profile')}
                className="w-full flex items-center justify-center py-2 rounded-md hover:bg-accent transition-colors"
              >
                <Avatar
                  src={user?.avatar}
                  firstName={user?.firstName}
                  lastName={user?.lastName}
                  size="sm"
                />
              </button>
            </Tooltip>
          ) : (
            <button
              onClick={() => navigate('/profile')}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-md hover:bg-accent transition-colors group"
            >
              <Avatar
                src={user?.avatar}
                firstName={user?.firstName}
                lastName={user?.lastName}
                size="sm"
                online
              />
              <div className="flex-1 min-w-0 text-left">
                <p className="text-sm font-medium truncate leading-none">
                  {user?.firstName} {user?.lastName}
                </p>
                <p className="text-[11px] text-muted-foreground truncate mt-0.5">{user?.email}</p>
              </div>
            </button>
          )}

          {/* Collapse toggle */}
          <button
            onClick={toggleSidebar}
            className={cn(
              'w-full flex items-center gap-3 px-3 py-2 rounded-md',
              'text-muted-foreground hover:text-foreground hover:bg-accent',
              'transition-colors text-sm',
              sidebarCollapsed ? 'justify-center px-0' : '',
            )}
          >
            <PanelLeft className="h-4 w-4 shrink-0" />
            <AnimatePresence>
              {!sidebarCollapsed && (
                <motion.span
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="text-xs"
                >
                  Collapse
                </motion.span>
              )}
            </AnimatePresence>
          </button>
        </div>
      </aside>
    </TooltipProvider>
  );
}

