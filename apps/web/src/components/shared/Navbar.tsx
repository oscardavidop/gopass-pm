import { useNavigate, useLocation, Link } from 'react-router-dom';
import { Moon, Sun, LogOut, User, Settings, ChevronRight, Command } from 'lucide-react';
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

  return (
    <header className="h-14 border-b border-border bg-card/60 backdrop-blur-sm flex items-center justify-between px-6 shrink-0 gap-4">
      {/* Breadcrumbs */}
      <nav className="flex items-center gap-1 text-sm min-w-0">
        {breadcrumbs.map((crumb, i) => (
          <span key={crumb.href} className="flex items-center gap-1 min-w-0">
            {i > 0 && <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/50 shrink-0" />}
            {crumb.isLast ? (
              <span className="font-medium text-foreground truncate">{crumb.label}</span>
            ) : (
              <Link
                to={crumb.href}
                className="text-muted-foreground hover:text-foreground transition-colors truncate"
              >
                {crumb.label}
              </Link>
            )}
          </span>
        ))}
      </nav>

      <div className="flex items-center gap-1 shrink-0">
        {/* CMD+K trigger */}
        <button
          onClick={openCommandPalette}
          className="hidden md:flex items-center gap-2 h-8 px-3 rounded-md text-xs text-muted-foreground border border-border/50 bg-accent/30 hover:bg-accent hover:text-foreground transition-colors"
          title="Open command palette (⌘K)"
        >
          <Command className="h-3 w-3" />
          <span>Search…</span>
          <kbd className="ml-1 border border-border/50 rounded px-1 text-[10px]">⌘K</kbd>
        </button>

        {/* Notification bell */}
        <NotificationBell />

        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          className="h-8 w-8 rounded-md flex items-center justify-center hover:bg-accent transition-colors text-muted-foreground hover:text-foreground"
          title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {isDark
            ? <Sun className="h-4 w-4" />
            : <Moon className="h-4 w-4" />
          }
        </button>

        {/* User menu */}
        <DropdownMenu.Root>
          <DropdownMenu.Trigger asChild>
            <button className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-accent transition-colors ml-1">
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
    </header>
  );
}

