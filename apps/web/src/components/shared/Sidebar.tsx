import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Command,
  LayoutDashboard,
  FolderKanban,
  Calendar,
  Settings,
  Code2,
  ChevronsUpDown,
  Menu,
  PanelLeft,
  Plus,
  Sparkles,
  Users,
  X,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/utils/cn';
import { useUIStore } from '@/store/ui.store';
import { useAuthStore } from '@/store/auth.store';
import { Avatar } from '@/components/ui/Avatar';
import { Tooltip } from '@/components/ui/Tooltip';
import { TooltipProvider } from '@/components/ui/Tooltip';
import { Button } from '@/components/ui/Button';
import logoLight from '../../../assets/img/logo-light.png';
import logoDark from '../../../assets/img/logo-dark.png';
import { useTranslation } from 'react-i18next';

function SidebarContent({
  collapsed,
  mobile,
  onClose,
}: {
  collapsed: boolean;
  mobile?: boolean;
  onClose?: () => void;
}) {
  const { t } = useTranslation();
  const { theme, toggleSidebar, openCommandPalette } = useUIStore();
  const location = useLocation();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);

  const handleGo = (href: string) => {
    navigate(href);
    onClose?.();
  };

  const handleOpenCreateProject = () => {
    navigate('/projects');
    onClose?.();
    setTimeout(() => window.dispatchEvent(new CustomEvent('gopass:open-project-form')), 100);
  };

  const shellWidth = collapsed ? 'w-[72px]' : 'w-[272px]';
  const navSections = [
    {
      title: t('sidebar.workspace', { defaultValue: 'Workspace' }),
      items: [
        { label: t('projects.dashboard', { defaultValue: 'Dashboard' }), href: '/dashboard', icon: LayoutDashboard },
        { label: t('projects.title', { defaultValue: 'Projects' }), href: '/projects', icon: FolderKanban },
        { label: t('calendar.title', { defaultValue: 'Calendar' }), href: '/calendar', icon: Calendar },
      ],
    },
    {
      title: t('sidebar.system', { defaultValue: 'System' }),
      items: [
        { label: t('sidebar.developers', { defaultValue: 'Developers' }), href: '/developers', icon: Code2 },
        { label: t('sidebar.team', { defaultValue: 'Team' }), href: '/profile', icon: Users },
        { label: t('app.settings', { defaultValue: 'Settings' }), href: '/settings', icon: Settings },
      ],
    },
  ];

  return (
    <aside
      className={cn(
        'flex h-full flex-col border-r border-border/70 bg-card/80 backdrop-blur-xl',
        'relative overflow-hidden',
        shellWidth,
      )}
    >
      <div className="pointer-events-none absolute inset-0 opacity-70">
        <div className="absolute -top-24 -left-24 h-48 w-48 rounded-full bg-primary/15 blur-3xl" />
        <div className="absolute bottom-0 right-0 h-40 w-40 rounded-full bg-sky-400/10 blur-3xl" />
      </div>

      <div className="relative z-10 flex h-16 items-center border-b border-border/70 px-3">
        {mobile && (
          <button
            onClick={onClose}
            className="mr-1 inline-flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground lg:hidden"
            aria-label={t('sidebar.close', { defaultValue: 'Close sidebar' })}
          >
            <X className="h-4 w-4" />
          </button>
        )}

        <button
          onClick={() => !collapsed && undefined}
          className={cn(
            'group flex w-full items-center',
            collapsed ? 'justify-center px-0' : 'gap-2',
          )}
        >
          <img
            src={theme === 'dark' ? logoDark : logoLight}
            alt="Tasku"
            className={`transition-all duration-150 object-cover ${collapsed
                ? 'h-10 w-10 rounded-full object-[12%_center]'
                : 'object-center w-[134px]'
              }`}
          />

        </button>
      </div>

      <div className="relative z-10 flex-1 overflow-y-auto px-2 py-3">
        {!collapsed && (
          <div className="mb-3 grid grid-cols-2 gap-2">
            <Button
              size="sm"
              className="h-8 justify-start"
              onClick={handleOpenCreateProject}
            >
              <Plus className="h-3.5 w-3.5" />
              {t('projects.newProject', { defaultValue: 'New project' })}
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-8 justify-start"
              onClick={() => {
                openCommandPalette();
                onClose?.();
              }}
            >
              <Command className="h-3.5 w-3.5" />
              {t('commandPalette.title', { defaultValue: 'Palette' })}
            </Button>
          </div>
        )}

        <div className="space-y-3">
          {navSections.map((section) => (
            <div key={section.title}>
              {!collapsed && (
                <p className="mb-1.5 px-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground/70">
                  {section.title}
                </p>
              )}

              <div className="space-y-1">
                {section.items.map(({ href, icon: Icon, label }) => {
                  const active = location.pathname.startsWith(href);
                  const link = (
                    <Link
                      key={href}
                      to={href}
                      onClick={onClose}
                      className={cn(
                        'group relative flex items-center rounded-xl px-2.5 py-2 text-sm transition-all duration-150',
                        collapsed ? 'justify-center px-0' : 'gap-2.5',
                        active
                          ? 'bg-primary/12 text-foreground shadow-sm'
                          : 'text-muted-foreground hover:bg-accent/80 hover:text-foreground',
                      )}
                    >
                      {active && (
                        <motion.span
                          layoutId={mobile ? 'sidebar-active-mobile' : 'sidebar-active-desktop'}
                          className="absolute left-1 top-1/1 h-5 rounded-full border-l-2 border-primary"
                        />
                      )}

                      <Icon className={cn('h-4 w-4 shrink-0', active ? 'text-primary' : '')} />
                      {!collapsed && <span className="truncate">{label}</span>}
                    </Link>
                  );

                  return collapsed ? (
                    <Tooltip key={href} content={label} side="right" delayDuration={100}>
                      {link}
                    </Tooltip>
                  ) : (
                    link
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="relative z-10 border-t border-border/70 p-2.5">
        <button
          onClick={() => handleGo('/profile')}
          className={cn(
            'mb-2 flex w-full items-center rounded-xl  p-2 text-left transition-colors hover:bg-accent/70',
            collapsed ? 'justify-center bg-none rounded-0' : 'gap-2.5 border-border/60 bg-background/70 ',
          )}
        >
          <Avatar
            src={user?.avatar}
            firstName={user?.firstName}
            lastName={user?.lastName}
            size="sm"
            online
          />
          {!collapsed && (
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-foreground">
                {user?.firstName} {user?.lastName}
              </p>
              <p className="truncate text-[11px] text-muted-foreground">{user?.email}</p>
            </div>
          )}
        </button>

        <button
          onClick={() => {
            toggleSidebar();
            if (mobile) onClose?.();
          }}
          className={cn(
            'flex w-full items-center rounded-lg px-2.5 py-2 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground',
            collapsed ? 'justify-center px-0' : 'gap-2',
          )}
        >
          {mobile ? <Menu className="h-3.5 w-3.5" /> : <PanelLeft className="h-3.5 w-3.5" />}
          {!collapsed && <span>{collapsed ? t('sidebar.expand', { defaultValue: 'Expand sidebar' }) : t('sidebar.collapse', { defaultValue: 'Collapse sidebar' })}</span>}
        </button>

        {!collapsed && (
          <div className="mt-2 flex items-center gap-2 rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-2 py-1.5 text-[11px] text-emerald-400">
            <Sparkles className="h-3 w-3" />
            <span>{t('sidebar.realtimeCollaborationActive', { defaultValue: 'Realtime collaboration active' })}</span>
          </div>
        )}
      </div>
    </aside>
  );
}

export function Sidebar() {
  const sidebarCollapsed = useUIStore((s) => s.sidebarCollapsed);
  const sidebarMobileOpen = useUIStore((s) => s.sidebarMobileOpen);
  const closeSidebarMobile = useUIStore((s) => s.closeSidebarMobile);

  return (
    <TooltipProvider delayDuration={0}>
      <div className="fixed inset-y-0 left-0 z-40 hidden lg:block">
        <SidebarContent collapsed={sidebarCollapsed} />
      </div>

      <AnimatePresence>
        {sidebarMobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-background/70 backdrop-blur-sm lg:hidden"
              onClick={closeSidebarMobile}
            />
            <motion.div
              initial={{ x: -320, opacity: 0.8 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -320, opacity: 0.8 }}
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
              className="fixed inset-y-0 left-0 z-50 lg:hidden"
            >
              <SidebarContent collapsed={false} mobile onClose={closeSidebarMobile} />
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </TooltipProvider>
  );
}

