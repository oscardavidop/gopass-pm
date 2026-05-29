import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useIsFetching } from '@tanstack/react-query';
import { Moon, Sun, LogOut, User, Settings, ChevronRight, Command, Home, Menu, Search, Wifi } from 'lucide-react';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { useTheme } from '@/hooks/useTheme';
import { useLogout } from '@/hooks/useAuth';
import { useAuthStore } from '@/store/auth.store';
import { useUIStore } from '@/store/ui.store';
import { Avatar } from '@/components/ui/Avatar';
import { NotificationBell } from '@/components/shared/NotificationBell';
import { cn } from '@/utils/cn';

// Simple breadcrumb from pathname
function useBreadcrumbs() {
  const location = useLocation();
  const segments = location.pathname.split('/').filter(Boolean);
  if (segments.length === 0) {
    return [{ label: 'Dashboard', href: '/dashboard', isLast: true }];
  }
  return segments.map((seg, i) => ({
    label: seg.charAt(0).toUpperCase() + seg.slice(1).replace(/-/g, ' '),
    href: '/' + segments.slice(0, i + 1).join('/'),
    isLast: i === segments.length - 1,
  }));
}

export function Navbar() {
  const { isDark, toggleTheme } = useTheme();
  const { mutate: logout } = useLogout();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const breadcrumbs = useBreadcrumbs();
  const openCommandPalette = useUIStore((s) => s.openCommandPalette);
  const openSidebarMobile = useUIStore((s) => s.setSidebarMobileOpen);
  const isFetching = useIsFetching();

  return (
    <header className="sticky top-0 z-30 border-b border-border/70 bg-background/80 backdrop-blur-xl">
      <div className="flex h-16 items-center justify-between gap-3 px-3 md:px-5">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <button
            onClick={() => openSidebarMobile(true)}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border/70 bg-card text-muted-foreground hover:bg-accent hover:text-foreground lg:hidden"
            aria-label="Open menu"
          >
            <Menu className="h-4 w-4" />
          </button>

          {/* Breadcrumbs */}
          <nav className="hidden min-w-0 items-center gap-1 text-sm md:flex">
            <Link to="/dashboard" className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground">
              <Home className="h-3.5 w-3.5" />
            </Link>
            {breadcrumbs.map((crumb, i) => (
              <span key={crumb.href} className="flex min-w-0 items-center gap-1">
                {(i > 0 || breadcrumbs.length > 0) && <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground/50" />}
                {crumb.isLast ? (
                  <span className="truncate font-medium text-foreground">{crumb.label}</span>
                ) : (
                  <Link
                    to={crumb.href}
                    className="truncate text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {crumb.label}
                  </Link>
                )}
              </span>
            ))}
          </nav>

          {/* Global search */}
          <button
            onClick={openCommandPalette}
            className="group flex h-10 min-w-0 flex-1 items-center gap-2 rounded-xl border border-border/80 bg-card px-3 text-left text-sm text-muted-foreground transition-colors hover:border-border hover:bg-accent/40 md:max-w-lg"
            title="Open command palette (Cmd/Ctrl + K)"
          >
            <Search className="h-4 w-4 shrink-0" />
            <span className="truncate">Search projects, tasks, commands...</span>
            <span className="ml-auto hidden shrink-0 items-center gap-1 rounded-md border border-border/70 px-1.5 py-0.5 text-[10px] md:inline-flex">
              <Command className="h-3 w-3" /> K
            </span>
          </button>
        </div>

        <div className="flex shrink-0 items-center gap-1.5">
          <div className="hidden items-center gap-1 rounded-full border border-border/70 bg-card px-2 py-1 text-[11px] text-muted-foreground sm:flex">
            <Wifi className="h-3 w-3 text-emerald-400" />
            <span>Realtime</span>
            {isFetching > 0 && <span className="rounded-full bg-primary/15 px-1.5 py-0.5 text-primary">Syncing...</span>}
          </div>

          <NotificationBell />

          <button
            onClick={toggleTheme}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-border/70 bg-card text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>

        {/* User menu */}
        <DropdownMenu.Root>
          <DropdownMenu.Trigger asChild>
            <button className="ml-1 flex items-center gap-2 rounded-lg border border-border/70 bg-card px-2 py-1.5 transition-colors hover:bg-accent">
              <Avatar
                src={user?.avatar}
                firstName={user?.firstName}
                lastName={user?.lastName}
                size="sm"
              />
              <span className="text-sm font-medium hidden sm:inline-block max-w-[100px] truncate">
                {user?.firstName}
              </span>
            </button>
          </DropdownMenu.Trigger>

          <DropdownMenu.Portal>
            <DropdownMenu.Content
              align="end"
              sideOffset={8}
              className={cn(
                'z-50 min-w-52 rounded-xl border border-border bg-popover shadow-xl py-1.5',
                'animate-scale-in',
              )}
            >
              {/* User info */}
              <div className="px-3 py-2.5 border-b border-border mb-1">
                <div className="flex items-center gap-2.5">
                  <Avatar
                    src={user?.avatar}
                    firstName={user?.firstName}
                    lastName={user?.lastName}
                    size="md"
                    online
                  />
                  <div className="min-w-0">
                    <p className="text-sm font-semibold truncate">{user?.firstName} {user?.lastName}</p>
                    <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
                  </div>
                </div>
              </div>

              <DropdownMenu.Item
                className={cn(
                  'flex items-center gap-2.5 px-3 py-2 text-sm cursor-pointer rounded-md mx-1',
                  'hover:bg-accent focus:bg-accent outline-none transition-colors',
                )}
                onSelect={() => navigate('/profile')}
              >
                <User className="h-4 w-4 text-muted-foreground" />
                My profile
              </DropdownMenu.Item>

              <DropdownMenu.Item
                className={cn(
                  'flex items-center gap-2.5 px-3 py-2 text-sm cursor-pointer rounded-md mx-1',
                  'hover:bg-accent focus:bg-accent outline-none transition-colors',
                )}
                onSelect={() => navigate('/settings')}
              >
                <Settings className="h-4 w-4 text-muted-foreground" />
                Settings
              </DropdownMenu.Item>

              <DropdownMenu.Separator className="my-1.5 border-t border-border mx-1" />

              <DropdownMenu.Item
                className={cn(
                  'flex items-center gap-2.5 px-3 py-2 text-sm cursor-pointer rounded-md mx-1 mb-0.5',
                  'text-destructive hover:bg-destructive/10 focus:bg-destructive/10 outline-none transition-colors',
                )}
                onSelect={() => logout()}
              >
                <LogOut className="h-4 w-4" />
                Sign out
              </DropdownMenu.Item>
            </DropdownMenu.Content>
          </DropdownMenu.Portal>
        </DropdownMenu.Root>
        </div>
      </div>
    </header>
  );
}

