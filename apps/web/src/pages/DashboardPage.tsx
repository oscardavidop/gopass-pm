import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  FolderKanban, CheckCircle2, Clock, AlertTriangle,
  TrendingUp, TrendingDown, ArrowRight, Zap, Plus,
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Skeleton } from '@/components/ui/Skeleton';
import { Badge } from '@/components/ui/Badge';
import { Avatar } from '@/components/ui/Avatar';
import { timeAgo } from '@/utils/formatters';
import {
  useDashboardStats, useDashboardTimeline, useDashboardActivity,
  useDashboardProjectsOverview,
} from '@/hooks/useDashboard';
import { useAuthStore } from '@/store/auth.store';

const STATUS_PALETTE: Record<string, string> = {
  TODO: '#6366f1', IN_PROGRESS: '#3b82f6', REVIEW: '#f59e0b', DONE: '#10b981',
};

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

export function DashboardPage() {
  const user = useAuthStore((s) => s.user);
  const { data: stats, isLoading: statsLoading }       = useDashboardStats();
  const { data: timeline, isLoading: timelineLoading } = useDashboardTimeline();
  const { data: activity, isLoading: activityLoading } = useDashboardActivity(10);
  const { data: projectsOverview }                     = useDashboardProjectsOverview();

  const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.07 } } };
  const item      = { hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0 } };

  const kpis = useMemo(() => stats
    ? [
        { label: 'Total Projects', value: stats.projects.total, sub: `${stats.projects.active} active`, icon: FolderKanban, color: 'text-indigo-400', bg: 'bg-indigo-500/10', trend: +12 },
        { label: 'Tasks Done',     value: stats.tasks.done,     sub: `${stats.tasks.completionRate}% rate`,    icon: CheckCircle2,  color: 'text-emerald-400', bg: 'bg-emerald-500/10', trend: +8 },
        { label: 'In Progress',    value: stats.tasks.byStatus?.IN_PROGRESS ?? 0, sub: 'tasks active', icon: Clock, color: 'text-blue-400', bg: 'bg-blue-500/10', trend: 0 },
        { label: 'Overdue',        value: stats.tasks.overdue,  sub: 'need attention', icon: AlertTriangle, color: 'text-red-400', bg: 'bg-red-500/10', trend: -3 },
      ]
    : [], [stats]);

  const pieData = useMemo(() => stats?.tasks.byStatus
    ? Object.entries(stats.tasks.byStatus).map(([name, value]) => ({ name, value }))
    : [], [stats]);

  return (
    <div className="space-y-6 page-enter">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <motion.h1
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-2xl font-bold tracking-tight"
          >
            {greeting()}, {user?.firstName} 👋
          </motion.h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            Here's an overview of your workspace.
          </p>
        </div>

        {/* Quick actions */}
        <div className="flex items-center gap-2">
          <Link to="/projects">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-border hover:bg-accent transition-colors text-muted-foreground"
            >
              <FolderKanban className="h-3.5 w-3.5" />
              All projects
              <ArrowRight className="h-3 w-3" />
            </motion.button>
          </Link>
        </div>
      </div>

      {/* ── KPI cards ── */}
      <motion.div variants={container} initial="hidden" animate="show" className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statsLoading
          ? Array.from({ length: 4 }).map((_, i) => (
              <Card key={i}><CardContent className="pt-6">
                <Skeleton className="h-10 w-10 rounded-xl mb-3" />
                <Skeleton className="h-8 w-16 mb-1.5" />
                <Skeleton className="h-3.5 w-24" />
              </CardContent></Card>
            ))
          : kpis.map((kpi) => (
              <motion.div key={kpi.label} variants={item}>
                <Card className="hover:shadow-glow-sm transition-all duration-300 hover:-translate-y-0.5 group">
                  <CardContent className="pt-5 pb-5">
                    <div className="flex items-start justify-between mb-3">
                      <div className={`w-10 h-10 rounded-xl ${kpi.bg} flex items-center justify-center group-hover:scale-110 transition-transform`}>
                        <kpi.icon className={`h-5 w-5 ${kpi.color}`} />
                      </div>
                      {kpi.trend !== 0 && (
                        <span className={`flex items-center gap-0.5 text-xs font-medium ${kpi.trend > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                          {kpi.trend > 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                          {Math.abs(kpi.trend)}%
                        </span>
                      )}
                    </div>
                    <p className="text-3xl font-bold tabular-nums">{kpi.value}</p>
                    <p className="text-xs text-muted-foreground mt-1">{kpi.label}</p>
                    <p className="text-xs text-muted-foreground/60 mt-0.5">{kpi.sub}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
      </motion.div>

      {/* ── Completion bar ── */}
      {stats && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}>
          <Card>
            <CardContent className="pt-5 pb-5">
              <div className="flex items-center justify-between mb-2.5">
                <span className="text-sm font-medium flex items-center gap-2">
                  <Zap className="h-4 w-4 text-amber-400" />
                  Overall completion rate
                </span>
                <span className="text-sm font-bold gradient-primary bg-clip-text text-transparent">
                  {stats.tasks.completionRate}%
                </span>
              </div>
              <div className="h-2 bg-secondary rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${stats.tasks.completionRate}%` }}
                  transition={{ duration: 1, ease: 'easeOut', delay: 0.4 }}
                  className="h-full gradient-primary rounded-full"
                />
              </div>
              <p className="text-xs text-muted-foreground mt-1.5">
                {stats.tasks.done} of {stats.tasks.total} tasks completed
              </p>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* ── Charts row ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">Task activity (last 30 days)</CardTitle>
          </CardHeader>
          <CardContent>
            {timelineLoading ? (
              <Skeleton className="h-48 w-full rounded-lg" />
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={timeline ?? []} margin={{ top: 4, right: 4, bottom: 0, left: -24 }}>
                  <defs>
                    <linearGradient id="gc" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#6366f1" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gd" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#10b981" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" strokeOpacity={0.5} />
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} tickFormatter={(v) => v.slice(5)} />
                  <YAxis tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
                  <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 12 }} />
                  <Area type="monotone" dataKey="created" stroke="#6366f1" strokeWidth={2} fill="url(#gc)" name="Created" />
                  <Area type="monotone" dataKey="done"    stroke="#10b981" strokeWidth={2} fill="url(#gd)" name="Done" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">Tasks by status</CardTitle>
          </CardHeader>
          <CardContent>
            {pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="45%" innerRadius={48} outerRadius={68} paddingAngle={4} dataKey="value" strokeWidth={0}>
                    {pieData.map((entry, idx) => (
                      <Cell key={idx} fill={STATUS_PALETTE[entry.name] ?? '#6366f1'} />
                    ))}
                  </Pie>
                  <Legend iconSize={8} iconType="circle" wrapperStyle={{ fontSize: 11 }} />
                  <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">No data yet</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Bottom row ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Projects */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold">Projects</CardTitle>
              <Link to="/projects" className="text-xs text-muted-foreground hover:text-primary transition-colors flex items-center gap-1">
                View all <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          </CardHeader>
          <CardContent className="space-y-3.5">
            {(projectsOverview ?? []).length === 0 ? (
              <div className="text-center py-6 text-muted-foreground text-sm">
                <FolderKanban className="h-8 w-8 mx-auto mb-2 opacity-30" />
                No projects yet
              </div>
            ) : (
              projectsOverview?.slice(0, 5).map((p: any) => (
                <Link key={p.id} to={`/projects/${p.id}`} className="block group">
                  <div className="flex items-center justify-between text-sm mb-1">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: p.color }} />
                      <span className="font-medium truncate group-hover:text-primary transition-colors">{p.name}</span>
                    </div>
                    <span className="text-xs text-muted-foreground shrink-0 ml-2">{p.progress ?? 0}%</span>
                  </div>
                  <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${p.progress ?? 0}%` }}
                      transition={{ duration: 0.8, ease: 'easeOut' }}
                      className="h-full rounded-full"
                      style={{ background: p.color }}
                    />
                  </div>
                </Link>
              ))
            )}
          </CardContent>
        </Card>

        {/* Activity */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">Recent activity</CardTitle>
          </CardHeader>
          <CardContent>
            {activityLoading ? (
              <div className="space-y-3.5">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex gap-3">
                    <Skeleton className="h-7 w-7 rounded-full shrink-0" />
                    <div className="flex-1 space-y-1.5">
                      <Skeleton className="h-3.5 w-3/4" />
                      <Skeleton className="h-3 w-1/3" />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
                {(activity ?? []).length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-6">No recent activity</p>
                ) : (
                  (activity ?? []).map((log: any) => (
                    <div key={log.id} className="flex gap-3">
                      <Avatar
                        firstName={log.user.firstName}
                        lastName={log.user.lastName}
                        size="xs"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs leading-relaxed">
                          <span className="font-medium">{log.user.firstName}</span>{' '}
                          <span className="text-muted-foreground lowercase">{log.action.replace(/_/g, ' ')}</span>
                          {log.task && (
                            <> <span className="text-foreground font-medium truncate">"{log.task.title}"</span></>
                          )}
                        </p>
                        <p className="text-xs text-muted-foreground/60">{timeAgo(log.createdAt)}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
