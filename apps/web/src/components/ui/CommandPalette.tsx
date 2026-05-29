import { useEffect, useCallback, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Command } from 'cmdk';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard, FolderKanban, Calendar, Settings, User,
  Search, Plus, LogOut, Sun, Moon, Zap, Hash, Clock3, ClipboardList,
  ChevronRight, Command as CommandIcon,
} from 'lucide-react';
import { useUIStore } from '@/store/ui.store';
import { useAuthStore } from '@/store/auth.store';
import { useProjects } from '@/hooks/useProjects';
import { useProjectTasks } from '@/hooks/useTasks';
import { cn } from '@/utils/cn';

interface CommandItem {
  id: string;
  label: string;
  sublabel?: string;
  icon: React.ElementType;
  colorClass?: string;
  iconColor?: string;
  shortcut?: string[];
  action: () => void;
  group: string;
}

const RECENT_KEY = 'tasku-command-recent';

export function CommandPalette() {
  const open = useUIStore((s) => s.commandPaletteOpen);
  const closeCP = useUIStore((s) => s.closeCommandPalette);
  const toggleTheme = useUIStore((s) => s.toggleTheme);
  const theme = useUIStore((s) => s.theme);
  const logout = useAuthStore((s) => s.clearAuth);
  const location = useLocation();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [recentIds, setRecentIds] = useState<string[]>([]);

  const { data: projectsData } = useProjects();
  const projects = projectsData?.items ?? projectsData ?? [];
  const currentProjectId = useMemo(() => {
    const match = location.pathname.match(/^\/projects\/([^/]+)$/);
    return match?.[1] ?? null;
  }, [location.pathname]);
  const currentProject = useMemo(
    () => (projects as any[]).find((p: any) => p.id === currentProjectId),
    [projects, currentProjectId],
  );
  const { data: currentProjectTasksData } = useProjectTasks(currentProjectId ?? '', {
    limit: 12,
  });
  const currentProjectTasks = currentProjectTasksData?.items ?? [];

  /* ── Global shortcut: ⌘K / Ctrl+K ── */
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        useUIStore.getState().toggleCommandPalette();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(RECENT_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) setRecentIds(parsed.slice(0, 6));
    } catch {
      // Ignore localStorage parse errors
    }
  }, []);

  const pushRecent = useCallback((id: string) => {
    setRecentIds((prev) => {
      const next = [id, ...prev.filter((item) => item !== id)].slice(0, 6);
      localStorage.setItem(RECENT_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const go = useCallback(
    (path: string) => {
      navigate(path);
      closeCP();
      setSearch('');
    },
    [navigate, closeCP],
  );

  /* ── Static commands ── */
  const staticCommands: CommandItem[] = [
    {
      id: 'dashboard', label: 'Go to Dashboard', icon: LayoutDashboard,
      colorClass: 'text-indigo-400', group: 'Navigation',
      shortcut: ['G', 'D'],
      action: () => go('/'),
    },
    {
      id: 'projects', label: 'Go to Projects', icon: FolderKanban,
      colorClass: 'text-violet-400', group: 'Navigation',
      shortcut: ['G', 'P'],
      action: () => go('/projects'),
    },
    {
      id: 'calendar', label: 'Go to Calendar', icon: Calendar,
      colorClass: 'text-blue-400', group: 'Navigation',
      action: () => go('/calendar'),
    },
    {
      id: 'profile', label: 'Go to Profile', icon: User,
      colorClass: 'text-emerald-400', group: 'Navigation',
      shortcut: ['G', 'U'],
      action: () => go('/profile'),
    },
    {
      id: 'settings', label: 'Go to Settings', icon: Settings,
      colorClass: 'text-amber-400', group: 'Navigation',
      shortcut: ['G', 'S'],
      action: () => go('/settings'),
    },
    {
      id: 'new-project', label: 'New Project…', icon: Plus,
      colorClass: 'text-green-400', group: 'Create',
      shortcut: ['C', 'P'],
      action: () => { go('/projects'); setTimeout(() => window.dispatchEvent(new CustomEvent('gopass:open-project-form')), 100); },
    },
    {
      id: 'new-task', label: 'New Task…', icon: Plus,
      colorClass: 'text-sky-400', group: 'Create',
      shortcut: ['C', 'T'],
      action: () => {
        if (currentProjectId) {
          closeCP();
          window.dispatchEvent(new CustomEvent('gopass:open-task-form'));
          return;
        }
        go('/projects');
      },
    },
    {
      id: 'new-task-ai', label: 'Generate Task with AI…', icon: Zap,
      colorClass: 'text-violet-400', group: 'Create',
      shortcut: ['N'],
      action: () => {
        if (currentProjectId) {
          closeCP();
          window.dispatchEvent(new CustomEvent('gopass:open-task-form'));
          return;
        }
        go('/projects');
      },
    },
    {
      id: 'toggle-theme', label: theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode',
      icon: theme === 'dark' ? Sun : Moon,
      colorClass: 'text-yellow-400', group: 'Appearance',
      action: () => { toggleTheme(); closeCP(); },
    },
    {
      id: 'logout', label: 'Sign out', icon: LogOut,
      colorClass: 'text-red-400', group: 'Account',
      action: () => { logout(); closeCP(); navigate('/login'); },
    },
  ];

  /* ── Project commands (dynamic) ── */
  const projectCommands: CommandItem[] = Array.isArray(projects)
    ? projects.slice(0, 8).map((p: any) => ({
      id: `project-${p.id}`,
      label: p.name,
      sublabel: `${p._count?.tasks ?? 0} tasks`,
      icon: Hash,
      colorClass: p.color ? undefined : 'text-indigo-400',
      iconColor: p.color,
      group: 'Projects',
      action: () => go(`/projects/${p.id}`),
    }))
    : [];

  const contextCommands: CommandItem[] = currentProjectId
    ? [
      {
        id: `context-open-project-${currentProjectId}`,
        label: `Open ${currentProject?.name ?? 'project'} board`,
        sublabel: 'Current context',
        icon: FolderKanban,
        colorClass: 'text-primary',
        group: 'Context',
        action: () => go(`/projects/${currentProjectId}`),
      },
      {
        id: `context-new-task-${currentProjectId}`,
        label: 'Create task in this project',
        sublabel: 'Quick action',
        icon: Plus,
        colorClass: 'text-emerald-400',
        group: 'Context',
        shortcut: ['N', 'T'],
        action: () => {
          closeCP();
          window.dispatchEvent(new CustomEvent('gopass:open-task-form'));
        },
      },
    ]
    : [];

  const taskCommands: CommandItem[] = currentProjectId
    ? currentProjectTasks.map((task: any) => ({
      id: `context-task-${task.id}`,
      label: task.title,
      sublabel: task.status?.replace('_', ' '),
      icon: ClipboardList,
      colorClass: 'text-cyan-400',
      group: 'Tasks in Context',
      action: () => {
        navigate(`/projects/${currentProjectId}`);
        closeCP();
        window.dispatchEvent(new CustomEvent('gopass:open-task-detail', { detail: { taskId: task.id } }));
      },
    }))
    : [];

  const allCommands = [...staticCommands, ...contextCommands, ...taskCommands, ...projectCommands];
  const recentCommands = useMemo(
    () => recentIds.map((id) => allCommands.find((cmd) => cmd.id === id)).filter(Boolean) as CommandItem[],
    [allCommands, recentIds],
  );

  /* Group commands for rendering */
  const groups = allCommands.reduce<Record<string, CommandItem[]>>((acc, cmd) => {
    if (!acc[cmd.group]) acc[cmd.group] = [];
    acc[cmd.group].push(cmd);
    return acc;
  }, {});

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm"
            onClick={() => { closeCP(); setSearch(''); }}
          />

          {/* Palette */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96, x: "-50%", y: "calc(-50% - 20px)" }}
            animate={{ opacity: 1, scale: 1, x: "-50%", y: "-50%" }}
            exit={{ opacity: 0, scale: 0.96, x: "-50%", y: "calc(-50% - 20px)" }}
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
            className="fixed top-1/2 left-1/2 z-[61] w-full max-w-xl"
          // Nota: Quitamos '-translate-x-1/2' de Tailwind
          >


            <Command
              shouldFilter={true}
              className="rounded-xl border border-border bg-card shadow-2xl overflow-hidden"
              loop
            >
              {/* Search Input */}
              <div className="flex items-center gap-3 px-4 py-3.5 border-b border-border">
                <Search className="h-4 w-4 text-muted-foreground shrink-0" />
                <Command.Input
                  value={search}
                  onValueChange={setSearch}
                  placeholder="Search commands, projects, tasks…"
                  className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
                  autoFocus
                />
                <div className="flex items-center gap-1">
                  <kbd className="text-[10px] text-muted-foreground border border-border rounded px-1.5 py-0.5">⌘K</kbd>
                </div>
              </div>

              {/* Results */}
              <Command.List className="max-h-[400px] overflow-y-auto p-2">
                <Command.Empty className="flex flex-col items-center justify-center py-10 text-muted-foreground">
                  <Zap className="h-8 w-8 mb-2 opacity-20" />
                  <p className="text-sm">No results for "{search}"</p>
                </Command.Empty>

                {search.length === 0 && recentCommands.length > 0 && (
                  <Command.Group
                    heading="Recent"
                    className="[&_[cmdk-group-heading]]:text-[10px] [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wider [&_[cmdk-group-heading]]:text-muted-foreground/60 [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:mt-2 [&_[cmdk-group-heading]]:mb-0.5"
                  >
                    {recentCommands.map((cmd) => (
                      <PaletteItem
                        key={`recent-${cmd.id}`}
                        cmd={{ ...cmd, group: 'Recent', icon: Clock3 }}
                        onClose={() => { closeCP(); setSearch(''); }}
                        onSelect={() => pushRecent(cmd.id)}
                      />
                    ))}
                  </Command.Group>
                )}

                {Object.entries(groups).map(([group, items]) => (
                  <Command.Group
                    key={group}
                    heading={group}
                    className="[&_[cmdk-group-heading]]:text-[10px] [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wider [&_[cmdk-group-heading]]:text-muted-foreground/60 [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:mt-2 [&_[cmdk-group-heading]]:mb-0.5"
                  >
                    {items.map((cmd) => (
                      <PaletteItem
                        key={cmd.id}
                        cmd={cmd}
                        onClose={() => { closeCP(); setSearch(''); }}
                        onSelect={() => pushRecent(cmd.id)}
                      />
                    ))}
                  </Command.Group>
                ))}
              </Command.List>

              {/* Footer */}
              <div className="flex items-center justify-between px-4 py-2.5 border-t border-border bg-background/50 text-[10px] text-muted-foreground/60">
                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-1"><kbd className="border border-border rounded px-1">↑↓</kbd> navigate</span>
                  <span className="flex items-center gap-1"><kbd className="border border-border rounded px-1">↵</kbd> select</span>
                  <span className="flex items-center gap-1"><kbd className="border border-border rounded px-1">esc</kbd> close</span>
                </div>
                <div className="flex items-center gap-1 opacity-60">
                  <CommandIcon className="h-3 w-3" />
                  <span>Tasku</span>
                </div>
              </div>
            </Command>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

function PaletteItem({
  cmd,
  onClose,
  onSelect,
}: {
  cmd: CommandItem;
  onClose: () => void;
  onSelect?: () => void;
}) {
  const Icon = cmd.icon;
  return (
    <Command.Item
      key={cmd.id}
      value={`${cmd.label} ${cmd.sublabel ?? ''} ${cmd.group}`}
      onSelect={() => {
        onSelect?.();
        cmd.action();
        onClose();
      }}
      className={cn(
        'flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer text-sm',
        'text-muted-foreground hover:text-foreground',
        'data-[selected=true]:bg-accent data-[selected=true]:text-foreground',
        'transition-colors group',
      )}
    >
      <div
        className={cn(
          'w-7 h-7 rounded-md flex items-center justify-center bg-accent/50 group-data-[selected=true]:bg-accent shrink-0',
          cmd.colorClass,
        )}
        style={cmd.iconColor ? { color: cmd.iconColor } : undefined}
      >
        <Icon className="h-3.5 w-3.5" />
      </div>

      <div className="flex-1 min-w-0">
        <span className="font-medium text-foreground">{cmd.label}</span>
        {cmd.sublabel && (
          <span className="ml-2 text-xs text-muted-foreground">{cmd.sublabel}</span>
        )}
      </div>

      {cmd.shortcut && (
        <div className="flex items-center gap-0.5 shrink-0">
          {cmd.shortcut.map((k, i) => (
            <kbd key={i} className="text-[10px] border border-border/60 rounded px-1.5 py-0.5 bg-background/50 text-muted-foreground/60">
              {k}
            </kbd>
          ))}
        </div>
      )}

      <ChevronRight className="h-3 w-3 opacity-0 group-data-[selected=true]:opacity-40 shrink-0" />
    </Command.Item>
  );
}
