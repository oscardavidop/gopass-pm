import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowRight,
  Bell,
  BellRing,
  Bot,
  CalendarDays,
  CheckCircle2,
  CheckSquare,
  ChevronRight,
  Clock3,
  Columns3,
  Command,
  Flag,
  Gauge,
  Globe,
  History,
  Layers3,
  LineChart,
  Lock,
  Menu,
  MessageSquare,
  Moon,
  Radar,
  RefreshCw,
  Settings2,
  Sparkles,
  Sun,
  Tags,
  Users,
  Wand2,
  X,
  Zap,
} from 'lucide-react';

import { useTheme } from '@/hooks/useTheme';
import { useTranslation } from 'react-i18next';
import { LanguageThemeSwitcher } from '@/components/shared/LanguageThemeSwitcher';
import logoLight from '../../assets/img/logo-light.png';
import logoDark from '../../assets/img/logo-dark.png';

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] } },
};
const fadeIn = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { duration: 0.35 } },
};
const stagger = (delay = 0.07) => ({
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: delay } },
});

function Section({ children, className = '', id }: { children: React.ReactNode; className?: string; id?: string }) {
  return <section id={id} className={`mx-auto w-full max-w-7xl px-5 md:px-8 ${className}`}>{children}</section>;
}

function Pill({ children, color = 'default' }: { children: React.ReactNode; color?: 'default' | 'ai' | 'green' | 'amber' | 'red' }) {
  const colorMap: Record<string, string> = {
    default: 'border-border/80 bg-secondary/60 text-muted-foreground',
    ai: 'border-primary/40 bg-primary/10 text-primary',
    green: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
    amber: 'border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-400',
    red: 'border-red-500/40 bg-red-500/10 text-red-500',
  };
  return <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-medium ${colorMap[color]}`}>{children}</span>;
}

function ScreenPlaceholder({ label, hint, aspect = '16/9', glow = 'primary', className = '' }: {
  label: string; hint?: string; aspect?: string; glow?: 'primary' | 'ai' | 'orange'; className?: string;
}) {
  const glowMap: Record<string, string> = {
    primary: 'rgba(99,102,241,0.28)',
    ai: 'rgba(168,85,247,0.28)',
    orange: 'rgba(251,146,60,0.22)',
  };
  return (
    <div className={`relative overflow-hidden rounded-2xl border border-border/60 bg-slate-950 shadow-2xl ${className}`} style={{ aspectRatio: aspect }}>
      <div className="absolute inset-0" style={{ background: `radial-gradient(circle at 14% 12%, ${glowMap[glow]}, transparent 38%), radial-gradient(circle at 88% 82%, rgba(34,211,238,0.15), transparent 34%), linear-gradient(180deg, hsl(224 71% 4%), hsl(222 47% 6%))` }} />
      <div className="absolute inset-0 bg-[linear-gradient(rgba(148,163,184,0.1)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,0.1)_1px,transparent_1px)] bg-[size:28px_28px] opacity-40" />
      <div className="absolute left-0 right-0 top-0 flex h-9 items-center gap-2 border-b border-white/10 bg-white/5 px-4">
        <div className="flex gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-red-500/60" />
          <span className="h-2.5 w-2.5 rounded-full bg-amber-500/60" />
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-500/60" />
        </div>
        <span className="mx-auto text-[10px] font-medium text-white/30">{label}</span>
      </div>
      <div className="absolute inset-0 flex flex-col items-center justify-center px-8 pt-8 text-center">
        <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/5"><Sparkles className="h-5 w-5 text-white/30" /></div>
        <p className="text-sm font-semibold text-white/60">{label}</p>
        {hint && <p className="mt-1.5 max-w-[80%] text-xs text-white/30">{hint}</p>}
      </div>
      <div className="absolute bottom-0 left-1/2 h-24 w-48 -translate-x-1/2 rounded-full opacity-30 blur-2xl" style={{ background: glowMap[glow] }} />
    </div>
  );
}

function LandingNavbar({ onNavigate, isDark }: { onNavigate: (to: string) => void, isDark: boolean }) {
  const { t } = useTranslation();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 12);
    window.addEventListener('scroll', handler, { passive: true });
    return () => window.removeEventListener('scroll', handler);
  }, []);

  const navLinks = [
    { label: t('landing.nav.features', { defaultValue: 'Features' }), href: '#features' },
    { label: t('landing.nav.ai', { defaultValue: 'AI' }), href: '#ai' },
    { label: t('landing.nav.collaboration', { defaultValue: 'Collaboration' }), href: '#collab' },
    { label: t('landing.nav.analytics', { defaultValue: 'Analytics' }), href: '#analytics' },
  ];

  return (
    <header className={`sticky top-0 z-50 w-full transition-all duration-300 ${scrolled ? 'border-b border-border/60 bg-background/90 backdrop-blur-xl shadow-sm' : 'bg-transparent'}`}>
      <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between px-5 md:px-8">
        <button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} className="flex items-center gap-2.5">
          <img src={isDark ? logoDark : logoLight} alt="Tasku" className="object-contain" style={{
            width: '130px',
          }} />
        </button>
        <nav className="hidden items-center gap-1 md:flex">
          {navLinks.map((link) => (
            <a key={link.label} href={link.href} className="rounded-lg px-3 py-1.5 text-sm hover:bg-accent hover:text-foreground">{link.label}</a>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <LanguageThemeSwitcher variant="surface" />
          <button onClick={() => onNavigate('/login')} className="hidden rounded-lg px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground md:block">{t('auth.signInCta', { defaultValue: 'Sign in' })}</button>
          <button onClick={() => onNavigate('/register')} className="hidden h-9 items-center gap-1.5 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-sm transition-all hover:opacity-90 active:scale-[0.98] md:flex">
            {t('landing.getStarted')} <ArrowRight className="h-3.5 w-3.5" />
          </button>
          <button onClick={() => setMenuOpen((v) => !v)} className="flex h-9 w-9 items-center justify-center rounded-lg border border-border/70 bg-card md:hidden">
            {menuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
        </div>
      </div>
      <AnimatePresence>
        {menuOpen && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.18 }} className="border-t border-border/70 bg-background/95 backdrop-blur-xl md:hidden">
            <div className="flex flex-col gap-1 p-4">
              {navLinks.map((link) => (
                <a key={link.label} href={link.href} onClick={() => setMenuOpen(false)} className="rounded-lg px-3 py-2.5 text-sm text-muted-foreground hover:bg-accent hover:text-foreground">{link.label}</a>
              ))}
              <div className="mt-2 grid grid-cols-2 gap-2 border-t border-border pt-3">
                <button onClick={() => { onNavigate('/login'); setMenuOpen(false); }} className="rounded-lg border border-border py-2 text-sm font-medium text-foreground hover:bg-accent">{t('auth.signInCta', { defaultValue: 'Sign in' })}</button>
                <button onClick={() => { onNavigate('/register'); setMenuOpen(false); }} className="rounded-lg bg-primary py-2 text-sm font-semibold text-primary-foreground">{t('landing.getStarted')}</button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}

function AiTaskMock() {
  const { t } = useTranslation();
  const [stage, setStage] = useState<'input' | 'loading' | 'result'>('input');
  const [loadingIdx, setLoadingIdx] = useState(0);
  const loadingSteps = [
    t('landing.ai.step1', { defaultValue: 'Analyzing project context...' }),
    t('landing.ai.step2', { defaultValue: 'Generating subtasks...' }),
    t('landing.ai.step3', { defaultValue: 'Creating acceptance criteria...' }),
    t('landing.ai.step4', { defaultValue: 'Estimating effort...' }),
  ];

  const handleGenerate = () => {
    setStage('loading');
    setLoadingIdx(0);
    let i = 0;
    const timer = setInterval(() => {
      i++;
      setLoadingIdx(i);
      if (i >= loadingSteps.length - 1) { clearInterval(timer); setTimeout(() => setStage('result'), 600); }
    }, 620);
  };

  return (
    <div className="overflow-hidden rounded-2xl border border-border/70 bg-card shadow-xl">
      <div className="flex items-center justify-between border-b border-border/60 bg-card/80 px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded-md bg-primary/15"><Sparkles className="h-3.5 w-3.5 text-primary" /></div>
          <span className="text-xs font-semibold text-foreground">{t('landing.ai.title', { defaultValue: 'AI Task Generator' })}</span>
          <Pill color="ai"><Bot className="h-3 w-3" />{t('landing.ai.workersAi', { defaultValue: 'Workers AI' })}</Pill>
        </div>
        <button onClick={() => setStage('input')} className="flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"><RefreshCw className="h-3 w-3" /></button>
      </div>
      <div className="p-4 space-y-3">
        <div className="space-y-2">
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{t('landing.ai.describeIdea', { defaultValue: 'Describe your task idea' })}</label>
          <div className="flex min-h-[40px] w-full items-center gap-2 rounded-xl border border-border/80 bg-background/70 px-3 py-2 text-sm">
            <Wand2 className="h-3.5 w-3.5 shrink-0 text-primary" />
            <span className={stage === 'input' ? 'text-foreground' : 'text-muted-foreground'}>{t('landing.ai.ideaExample', { defaultValue: 'Build payment system with Stripe integration' })}</span>
          </div>
        </div>
        {stage === 'input' && (
          <button onClick={handleGenerate} className="flex h-9 w-full items-center justify-center gap-2 rounded-xl bg-primary text-sm font-semibold text-primary-foreground shadow-sm transition-all hover:opacity-90 active:scale-[0.98]">
            <Sparkles className="h-3.5 w-3.5" /> {t('landing.ai.generateWithAi', { defaultValue: 'Generate with AI' })}
          </button>
        )}
        <AnimatePresence>
          {stage === 'loading' && (
            <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-2 py-2">
              {loadingSteps.map((step, i) => (
                <motion.div key={step} initial={{ opacity: 0, x: -8 }} animate={{ opacity: i <= loadingIdx ? 1 : 0.3, x: 0 }} transition={{ delay: i * 0.12 }} className="flex items-center gap-2 text-xs text-muted-foreground">
                  {i < loadingIdx ? <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-500" /> : i === loadingIdx ? (<motion.div animate={{ rotate: 360 }} transition={{ duration: 0.9, repeat: Infinity, ease: 'linear' }}><RefreshCw className="h-3.5 w-3.5 shrink-0 text-primary" /></motion.div>) : <span className="h-3.5 w-3.5 shrink-0" />}
                  {step}
                </motion.div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
        <AnimatePresence>
          {stage === 'result' && (
            <motion.div key="result" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="space-y-3">
              <div className="rounded-xl border border-primary/20 bg-primary/5 p-3 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-semibold text-foreground leading-snug">{t('landing.ai.resultTitle', { defaultValue: 'Integrate Stripe Payment Gateway' })}</p>
                  <Pill color="red"><Flag className="h-3 w-3" />HIGH</Pill>
                </div>
                <p className="text-xs text-muted-foreground line-clamp-2">{t('landing.ai.resultDesc', { defaultValue: 'Implement end-to-end Stripe payment processing with webhook handling, idempotent charge operations, and PCI-compliant card collection via Stripe Elements.' })}</p>
                <div className="flex flex-wrap gap-2">
                  <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground"><Clock3 className="h-3 w-3" /> {t('landing.ai.estimate', { defaultValue: '14h estimated' })}</span>
                  <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground"><Layers3 className="h-3 w-3" /> {t('landing.ai.complexity', { defaultValue: 'HIGH complexity' })}</span>
                </div>
                <div className="flex flex-wrap gap-1">
                  {['backend', 'payments', 'api', 'security'].map((tag) => (
                    <span key={tag} className="rounded-full border border-border/70 bg-secondary/70 px-2 py-0.5 text-[10px] text-muted-foreground">{tag}</span>
                  ))}
                </div>
              </div>
              <div className="space-y-1">
                <p className="flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground"><CheckSquare className="h-3 w-3" /> {t('landing.ai.subtasks', { defaultValue: 'Subtasks (4)' })}</p>
                {[
                  t('landing.ai.subtask1', { defaultValue: 'Set up Stripe SDK and environment keys' }),
                  t('landing.ai.subtask2', { defaultValue: 'Implement payment intent creation endpoint' }),
                  t('landing.ai.subtask3', { defaultValue: 'Build webhook handler with signature verification' }),
                  t('landing.ai.subtask4', { defaultValue: 'Add error recovery and idempotency keys' }),
                ].map((st, i) => (
                  <div key={i} className="flex items-center gap-2 rounded-lg border border-border/50 bg-background/60 px-2.5 py-1.5 text-xs text-muted-foreground">
                    <span className="h-4 w-4 shrink-0 rounded border border-border bg-background text-[9px] flex items-center justify-center text-muted-foreground/50">{i + 1}</span>
                    {st}
                  </div>
                ))}
              </div>
              <button className="flex h-8 w-full items-center justify-center gap-1.5 rounded-xl bg-emerald-600/90 text-xs font-semibold text-white transition-all hover:bg-emerald-600 active:scale-[0.98]">
                <CheckCircle2 className="h-3.5 w-3.5" /> {t('landing.ai.confirmCreate', { defaultValue: 'Confirm & Create Task' })}
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function KanbanMock() {
  const { t } = useTranslation();
  const columns = [
    { id: 'todo', label: t('status.todo', { defaultValue: 'To do' }), dot: 'bg-slate-400', cards: [{ title: t('landing.kanban.card1', { defaultValue: 'API rate limiting' }), priority: 'MEDIUM', tag: 'backend', ai: false }, { title: t('landing.kanban.card2', { defaultValue: 'Payment flow' }), priority: 'HIGH', tag: 'payments', ai: true }] },
    { id: 'inprog', label: t('status.inProgress', { defaultValue: 'In progress' }), dot: 'bg-blue-400', cards: [{ title: t('landing.kanban.card3', { defaultValue: 'Auth token refresh' }), priority: 'HIGH', tag: 'auth', ai: false }, { title: t('landing.kanban.card4', { defaultValue: 'Dashboard charts' }), priority: 'MEDIUM', tag: 'frontend', ai: true }] },
    { id: 'review', label: t('status.review', { defaultValue: 'Review' }), dot: 'bg-amber-400', cards: [{ title: t('landing.kanban.card5', { defaultValue: 'Webhook handler' }), priority: 'CRITICAL', tag: 'backend', ai: true }] },
    { id: 'done', label: t('status.done', { defaultValue: 'Done' }), dot: 'bg-emerald-400', cards: [{ title: t('landing.kanban.card6', { defaultValue: 'User registration' }), priority: 'LOW', tag: 'auth', ai: false }, { title: t('landing.kanban.card7', { defaultValue: 'Email templates' }), priority: 'LOW', tag: 'comms', ai: false }] },
  ];
  const priorityColor: Record<string, string> = { LOW: 'border-l-slate-400', MEDIUM: 'border-l-amber-400', HIGH: 'border-l-orange-400', CRITICAL: 'border-l-red-500' };
  return (
    <div className="flex gap-3 overflow-x-auto pb-2">
      {columns.map((col) => (
        <div key={col.id} className="min-w-[190px] flex-1 space-y-2">
          <div className="flex items-center justify-between rounded-xl border border-border/60 bg-card px-3 py-2">
            <div className="flex items-center gap-2"><span className={`h-2 w-2 rounded-full ${col.dot}`} /><span className="text-xs font-semibold text-foreground">{col.label}</span></div>
            <span className="rounded-full bg-secondary px-1.5 py-0.5 text-[10px] text-muted-foreground">{col.cards.length}</span>
          </div>
          <div className="space-y-2">
            {col.cards.map((card, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 6 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.05 }} className={`rounded-xl border border-border/80 bg-card border-l-[3px] ${priorityColor[card.priority]} p-3 shadow-sm`}>
                <div className="flex items-start justify-between gap-1">
                  <p className="text-xs font-medium leading-snug text-foreground line-clamp-1">{card.title}</p>
                  {card.ai && <span className="shrink-0 inline-flex h-4 w-4 items-center justify-center rounded bg-primary/15"><Sparkles className="h-2.5 w-2.5 text-primary" /></span>}
                </div>
                <div className="mt-1.5 flex items-center justify-between">
                  <span className="rounded-full border border-border/60 bg-secondary/80 px-1.5 py-0.5 text-[10px] text-muted-foreground">{card.tag}</span>
                  <div className="h-5 w-5 rounded-full border-2 border-card bg-gradient-to-br from-primary to-violet-500 text-[9px] font-bold text-white flex items-center justify-center">{String.fromCharCode(65 + i)}</div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function PresenceMock() {
  const { t } = useTranslation();
  const users = [
    { name: 'Carlos M.', color: 'from-indigo-500 to-violet-500', action: t('landing.presence.action1', { defaultValue: 'moved task to Review' }) },
    { name: 'Laura P.', color: 'from-emerald-500 to-teal-500', action: t('landing.presence.action2', { defaultValue: 'added comment on Auth task' }) },
    { name: 'Diego R.', color: 'from-amber-500 to-orange-500', action: t('landing.presence.action3', { defaultValue: 'created AI task' }) },
  ];
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3 rounded-2xl border border-border/60 bg-card px-4 py-3">
        <div className="flex -space-x-2">
          {users.map((u, i) => (
            <div key={i} className={`relative h-8 w-8 rounded-full border-2 border-card bg-gradient-to-br ${u.color} flex items-center justify-center text-[11px] font-bold text-white`}>
              {u.name[0]}<span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full border-2 border-card bg-emerald-400" />
            </div>
          ))}
          <div className="h-8 w-8 rounded-full border-2 border-card bg-secondary flex items-center justify-center text-[10px] font-semibold text-muted-foreground">+2</div>
        </div>
        <div><p className="text-xs font-semibold text-foreground">{t('landing.presence.onlineNow', { defaultValue: '5 teammates online now' })}</p><p className="text-[11px] text-muted-foreground">{t('landing.presence.viewingProject', { defaultValue: 'All viewing Project Alpha' })}</p></div>
        <span className="ml-auto flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-1 text-[11px] text-emerald-600 dark:text-emerald-400">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />{t('common.live', { defaultValue: 'Live' })}
        </span>
      </div>
      <div className="space-y-2">
        {users.map((u, i) => (
          <motion.div key={i} initial={{ opacity: 0, x: -12 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }} className="flex items-center gap-3 rounded-xl border border-border/50 bg-card/60 px-3 py-2.5">
            <div className={`h-7 w-7 shrink-0 rounded-full bg-gradient-to-br ${u.color} flex items-center justify-center text-[11px] font-bold text-white`}>{u.name[0]}</div>
            <div className="min-w-0 flex-1"><span className="text-xs font-medium text-foreground">{u.name}</span><span className="text-xs text-muted-foreground"> {u.action}</span></div>
            <span className="text-[10px] text-muted-foreground/60">{t('common.now', { defaultValue: 'now' })}</span>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

function DashboardMock() {
  const { t } = useTranslation();
  const kpis = [
    { label: t('landing.dashboard.totalTasks', { defaultValue: 'Total tasks' }), value: '184', delta: '+12', color: 'text-foreground' },
    { label: t('project.completed', { defaultValue: 'Completed' }), value: '118', delta: '+8', color: 'text-emerald-600 dark:text-emerald-400' },
    { label: t('dashboard.overdue', { defaultValue: 'Overdue' }), value: '7', delta: '-3', color: 'text-red-500' },
    { label: t('landing.dashboard.completion', { defaultValue: 'Completion' }), value: '64%', delta: '+5%', color: 'text-primary' },
  ];
  const projects = [
    { name: 'Alpha v3', progress: 78, status: 'ACTIVE', color: '#6366f1' },
    { name: 'Payments', progress: 52, status: 'ACTIVE', color: '#10b981' },
    { name: 'Mobile App', progress: 31, status: 'ON_HOLD', color: '#f59e0b' },
  ];
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-4 gap-2">
        {kpis.map((kpi, i) => (
          <motion.div key={kpi.label} initial={{ opacity: 0, y: 8 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.07 }} className="rounded-xl border border-border/60 bg-card p-3">
            <p className="text-[10px] text-muted-foreground">{kpi.label}</p>
            <p className={`mt-1 text-xl font-bold ${kpi.color}`}>{kpi.value}</p>
            <p className="text-[10px] text-emerald-500">{kpi.delta} {t('landing.dashboard.thisWeek', { defaultValue: 'this week' })}</p>
          </motion.div>
        ))}
      </div>
      <div className="rounded-2xl border border-border/60 bg-card p-4">
        <p className="mb-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">{t('project.progress', { defaultValue: 'Project Progress' })}</p>
        <div className="space-y-3">
          {projects.map((p, i) => (
            <div key={i} className="space-y-1.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-sm" style={{ background: p.color }} />
                  <span className="text-xs font-medium text-foreground">{p.name}</span>
                  <Pill color={p.status === 'ACTIVE' ? 'green' : 'amber'}>{p.status}</Pill>
                </div>
                <span className="text-[11px] font-semibold text-muted-foreground">{p.progress}%</span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-secondary">
                <motion.div initial={{ width: 0 }} whileInView={{ width: `${p.progress}%` }} viewport={{ once: true }} transition={{ duration: 0.8, ease: 'easeOut', delay: i * 0.1 }} className="h-full rounded-full" style={{ background: p.color }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function FeatureCard({ icon: Icon, title, copy, badge }: { icon: React.ElementType; title: string; copy: string; badge?: string }) {
  return (
    <motion.div variants={fadeUp} className="group relative rounded-2xl border border-border/70 bg-card p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-lg">
      {badge && <span className="absolute right-3 top-3 rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">{badge}</span>}
      <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary ring-1 ring-primary/20"><Icon className="h-5 w-5" /></div>
      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{copy}</p>
    </motion.div>
  );
}

export function LandingPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { isDark } = useTheme();
  const onNavigate = (to: string) => navigate(to);

  return (
    <div className="relative min-h-screen overflow-hidden bg-background text-foreground antialiased">
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <div className="absolute -left-32 -top-32 h-[36rem] w-[36rem] rounded-full bg-primary/[0.07] blur-3xl" />
        <div className="absolute -right-32 top-[30rem] h-[30rem] w-[30rem] rounded-full bg-violet-500/[0.06] blur-3xl" />
        <div className="absolute bottom-0 left-1/3 h-[28rem] w-[40rem] rounded-full bg-cyan-400/[0.04] blur-3xl" />
      </div>

      <div className="relative z-10">
        <LandingNavbar onNavigate={onNavigate} isDark={isDark} />

        {/* Hero */}
        <Section className="pb-12 pt-16 md:pb-20 md:pt-24">
          <motion.div variants={stagger(0.09)} initial="hidden" animate="show" className="grid items-center gap-12 lg:grid-cols-[1.1fr_1fr]">
            <div className="space-y-7">
              <motion.div variants={fadeUp}>
                <span className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/[0.08] px-3 py-1.5 text-xs font-semibold text-primary backdrop-blur">
                  <Sparkles className="h-3.5 w-3.5" />
                  {t('landing.hero.badge', { defaultValue: 'AI-powered project management · realtime collaboration' })}
                </span>
              </motion.div>
              <motion.h1 variants={fadeUp} className="text-[2.6rem] font-extrabold leading-[1.04] tracking-tight text-foreground md:text-6xl lg:text-[3.5rem] xl:text-6xl">
                {t('landing.hero.title1', { defaultValue: 'Intelligent workflows' })}{' '}
                <span className="bg-gradient-to-r from-primary to-violet-400 bg-clip-text text-transparent">{t('landing.hero.title2', { defaultValue: 'built for speed.' })}</span>
              </motion.h1>
              <motion.p variants={fadeUp} className="max-w-lg text-base leading-relaxed text-muted-foreground md:text-lg">
                {t('landing.hero.copy', { defaultValue: 'Tasku combines AI task generation, realtime collaboration, and dynamic kanban to give teams the fastest path from idea to execution.' })}
              </motion.p>
              <motion.div variants={fadeUp} className="flex flex-wrap items-center gap-3">
                <button onClick={() => onNavigate('/register')} className="inline-flex h-11 items-center gap-2 rounded-xl bg-primary px-6 text-sm font-semibold text-primary-foreground shadow-sm transition-all hover:opacity-90 active:scale-[0.98]">
                  {t('landing.hero.getStartedFree', { defaultValue: 'Get Started Free' })} <ArrowRight className="h-4 w-4" />
                </button>
                <button onClick={() => onNavigate('/login')} className="inline-flex h-11 items-center gap-2 rounded-xl border border-border bg-card px-6 text-sm font-medium text-foreground shadow-sm transition-all hover:bg-accent active:scale-[0.98]">
                  {t('landing.hero.exploreDashboard', { defaultValue: 'Explore the Dashboard' })}
                </button>
              </motion.div>
              <motion.div variants={fadeIn} className="flex flex-wrap gap-4 pt-1 text-xs text-muted-foreground">
                {[{ icon: Sparkles, text: t('landing.hero.cap1', { defaultValue: '7 AI capabilities' }) }, { icon: Zap, text: t('landing.hero.cap2', { defaultValue: 'Realtime WebSocket sync' }) }, { icon: Lock, text: t('landing.hero.cap3', { defaultValue: 'Role-based access control' }) }].map(({ icon: Icon, text }) => (
                  <span key={text} className="flex items-center gap-1.5"><Icon className="h-3.5 w-3.5 text-primary" />{text}</span>
                ))}
              </motion.div>
            </div>
            <motion.div variants={fadeUp} className="relative">
              <div className="absolute -inset-6 rounded-[2rem] bg-gradient-to-br from-primary/15 via-violet-500/10 to-transparent blur-2xl" />
              <div className="relative rounded-[1.6rem] border border-border/60 bg-card/60 p-3 shadow-2xl backdrop-blur-sm">
              <img src="https://github.com/oscardavidop/gopass-pm/raw/main/docs/screenshots/dashboard.png" alt="Dashboard preview" className="rounded-lg border border-border/50 " />
                {/* <ScreenPlaceholder label={t('landing.screen.dashboardPreview', { defaultValue: 'Dashboard Preview' })} hint={t('landing.screen.dashboardHint', { defaultValue: 'KPIs, completion charts, activity feed, project overview' })} aspect="4/3" glow="primary" /> */}
              </div>
            </motion.div>
          </motion.div>
        </Section>

        {/* Stats bar */}
        <Section className="pb-16">
          <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.4 }} className="grid grid-cols-2 gap-3 rounded-2xl border border-border/60 bg-card/60 p-3 backdrop-blur md:grid-cols-4">
            {[
              { value: '7+', label: t('landing.stats.aiEndpoints', { defaultValue: 'AI endpoints' }), sub: t('landing.stats.aiEndpointsSub', { defaultValue: 'generate · improve · suggest' }) },
              { value: t('common.realtime', { defaultValue: 'Realtime' }), label: t('landing.stats.websocketSync', { defaultValue: 'WebSocket sync' }), sub: t('landing.stats.websocketSyncSub', { defaultValue: 'task · presence · notify' }) },
              { value: '4 lanes', label: t('landing.stats.dynamicKanban', { defaultValue: 'Dynamic kanban' }), sub: t('landing.stats.dynamicKanbanSub', { defaultValue: 'drag · drop · live update' }) },
              { value: '30-day', label: t('landing.stats.timelineAnalytics', { defaultValue: 'Timeline analytics' }), sub: t('landing.stats.timelineAnalyticsSub', { defaultValue: 'created · done · overdue' }) },
            ].map((s, i) => (
              <motion.div key={s.label} initial={{ opacity: 0, y: 8 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.06 }} className="rounded-xl border border-border/50 bg-background/60 px-4 py-4">
                <p className="text-xl font-extrabold tracking-tight text-foreground md:text-2xl">{s.value}</p>
                <p className="mt-0.5 text-sm font-semibold text-foreground">{s.label}</p>
                <p className="mt-0.5 text-[11px] text-muted-foreground">{s.sub}</p>
              </motion.div>
            ))}
          </motion.div>
        </Section>

        {/* AI Section */}
        <Section className="pb-20" id="ai">
          <motion.div variants={stagger(0.07)} initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.15 }}>
            <motion.div variants={fadeUp} className="mb-10">
              <Pill color="ai"><Bot className="h-3.5 w-3.5" />{t('landing.ai.powered', { defaultValue: 'AI-Powered' })}</Pill>
              <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-foreground md:text-4xl">{t('landing.ai.sectionTitle', { defaultValue: 'From idea to task in seconds.' })}</h2>
              <p className="mt-3 max-w-2xl text-base text-muted-foreground">{t('landing.ai.sectionCopy', { defaultValue: 'Describe what you need. The AI generates the complete task — title, description, subtasks, acceptance criteria, priority, effort estimate, and labels — grounded in your project context and team.' })}</p>
            </motion.div>
            <div className="grid gap-8 lg:grid-cols-[1fr_1fr]">
              <motion.div variants={fadeUp}><AiTaskMock /></motion.div>
              <motion.div variants={stagger(0.06)} className="grid gap-3 sm:grid-cols-2">
                {[
                  { icon: Wand2, title: t('landing.ai.card1Title', { defaultValue: 'Task Generation' }), copy: t('landing.ai.card1Copy', { defaultValue: 'Full task from a one-line idea: title, description, subtasks, criteria.' }), badge: t('landing.ai.cardCore', { defaultValue: 'Core' }) },
                  { icon: Layers3, title: t('landing.ai.card2Title', { defaultValue: 'Subtask Breakdown' }), copy: t('landing.ai.card2Copy', { defaultValue: 'Automatic implementation subtasks ordered for delivery.' }) },
                  { icon: MessageSquare, title: t('landing.ai.card3Title', { defaultValue: 'Description Improve' }), copy: t('landing.ai.card3Copy', { defaultValue: 'Rewrites your draft with precision, clarity, and engineering focus.' }) },
                  { icon: Flag, title: t('landing.ai.card4Title', { defaultValue: 'Priority Suggestion' }), copy: t('landing.ai.card4Copy', { defaultValue: 'AI infers urgency, complexity, and effort from context and due date.' }) },
                  { icon: Tags, title: t('landing.ai.card5Title', { defaultValue: 'Title Suggestions' }), copy: t('landing.ai.card5Copy', { defaultValue: 'Multiple concise, actionable title options generated instantly.' }) },
                  { icon: RefreshCw, title: t('landing.ai.card6Title', { defaultValue: 'Section Regenerate' }), copy: t('landing.ai.card6Copy', { defaultValue: 'Regenerate labels, criteria, or subtasks independently.' }) },
                ].map((f) => <FeatureCard key={f.title} {...f} />)}
              </motion.div>
            </div>
          </motion.div>
        </Section>

        {/* Realtime */}
        <Section className="pb-20" id="collab">
          <motion.div variants={stagger(0.08)} initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.15 }} className="grid items-start gap-12 lg:grid-cols-2">
            <motion.div variants={fadeUp}>
              <Pill color="green"><Zap className="h-3.5 w-3.5" />{t('common.realtime', { defaultValue: 'Realtime' })}</Pill>
              <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-foreground md:text-4xl">{t('landing.realtime.title1', { defaultValue: 'Every change, everywhere,' })} <span className="text-emerald-500 dark:text-emerald-400">{t('landing.realtime.title2', { defaultValue: 'instantly.' })}</span></h2>
              <p className="mt-3 max-w-lg text-base text-muted-foreground">{t('landing.realtime.copy', { defaultValue: 'WebSocket-powered room events keep your entire team in sync. No manual refresh. No stale data. Every task update, member join, and notification pushed live to all connected users.' })}</p>
              <div className="mt-6 space-y-3">
                {[
                  { icon: Zap, label: t('landing.realtime.card1Label', { defaultValue: 'Task events' }), desc: t('landing.realtime.card1Desc', { defaultValue: 'created · updated · deleted — instant across all members' }) },
                  { icon: Users, label: t('landing.realtime.card2Label', { defaultValue: 'Presence system' }), desc: t('landing.realtime.card2Desc', { defaultValue: 'See who is online and viewing each project in real time' }) },
                  { icon: BellRing, label: t('landing.realtime.card3Label', { defaultValue: 'Smart notifications' }), desc: t('landing.realtime.card3Desc', { defaultValue: 'Overdue alerts, due reminders, weekly digest — server-pushed' }) },
                  { icon: History, label: t('landing.realtime.card4Label', { defaultValue: 'Activity audit log' }), desc: t('landing.realtime.card4Desc', { defaultValue: 'Complete history of task changes with actor and timestamp' }) },
                ].map(({ icon: Icon, label, desc }) => (
                  <div key={label} className="flex items-start gap-3 rounded-xl border border-border/60 bg-card/60 px-4 py-3">
                    <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"><Icon className="h-4 w-4" /></div>
                    <div><p className="text-sm font-semibold text-foreground">{label}</p><p className="text-xs text-muted-foreground">{desc}</p></div>
                  </div>
                ))}
              </div>
            </motion.div>
            <motion.div variants={fadeUp}><PresenceMock /></motion.div>
          </motion.div>
        </Section>

        {/* Kanban */}
        <Section className="pb-20">
          <motion.div initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.2 }} variants={stagger(0.08)}>
            <motion.div variants={fadeUp} className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
              <div>
                <Pill><Columns3 className="h-3.5 w-3.5" />{t('landing.kanban.workflows', { defaultValue: 'Kanban Workflows' })}</Pill>
                <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-foreground md:text-4xl">{t('landing.kanban.title', { defaultValue: 'Boards that move with your team.' })}</h2>
                <p className="mt-3 max-w-xl text-base text-muted-foreground">{t('landing.kanban.copy', { defaultValue: 'Drag and drop tasks across live lanes. Built on DnD Kit with optimistic updates and instant WebSocket propagation to all project members.' })}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {([t('status.todo', { defaultValue: 'To do' }), t('status.inProgress', { defaultValue: 'In progress' }), t('status.review', { defaultValue: 'Review' }), t('status.done', { defaultValue: 'Done' })] as const).map((s, i) => (
                  <Pill key={s} color={(['default', 'ai', 'amber', 'green'] as const)[i]}>{s}</Pill>
                ))}
              </div>
            </motion.div>
            <motion.div variants={fadeUp}>
              <div className="rounded-2xl border border-border/60 bg-card/60 p-4 backdrop-blur"><KanbanMock /></div>
            </motion.div>
            <motion.div variants={stagger(0.07)} className="mt-6 grid gap-3 sm:grid-cols-3">
              {[
                { icon: Sparkles, title: t('landing.kanban.cardA', { defaultValue: 'AI-generated tasks' }), copy: t('landing.kanban.cardACopy', { defaultValue: 'Spark icon marks tasks created by AI — always visible in context.' }) },
                { icon: Flag, title: t('landing.kanban.cardB', { defaultValue: 'Priority indicators' }), copy: t('landing.kanban.cardBCopy', { defaultValue: 'Left-edge color borders signal LOW, MEDIUM, HIGH, CRITICAL urgency.' }) },
                { icon: Users, title: t('landing.kanban.cardC', { defaultValue: 'Assignee avatars' }), copy: t('landing.kanban.cardCCopy', { defaultValue: 'Member assignment visible inline on every card without opening.' }) },
              ].map((f) => <FeatureCard key={f.title} {...f} />)}
            </motion.div>
          </motion.div>
        </Section>

        {/* Analytics */}
        <Section className="pb-20" id="analytics">
          <motion.div initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.15 }} variants={stagger(0.08)} className="grid items-start gap-12 lg:grid-cols-[1fr_1fr]">
            <motion.div variants={fadeUp}>
              <Pill color="ai"><LineChart className="h-3.5 w-3.5" />{t('landing.nav.analytics', { defaultValue: 'Analytics' })}</Pill>
              <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-foreground md:text-4xl">{t('landing.analytics.title', { defaultValue: 'Operational clarity at a glance.' })}</h2>
              <p className="mt-3 max-w-lg text-base text-muted-foreground">{t('landing.analytics.copy', { defaultValue: 'Live KPIs, 30-day task timeline, project completion rates, workload distribution, and priority mix — all updated in real time.' })}</p>
              <div className="mt-6 grid grid-cols-2 gap-3">
                {[
                  { icon: Gauge, title: t('landing.analytics.card1Title', { defaultValue: 'Completion rate' }), desc: t('landing.analytics.card1Desc', { defaultValue: 'Done vs total with trend delta' }) },
                  { icon: LineChart, title: t('landing.analytics.card2Title', { defaultValue: '30-day timeline' }), desc: t('landing.analytics.card2Desc', { defaultValue: 'Created vs completed per day' }) },
                  { icon: Radar, title: t('landing.analytics.card3Title', { defaultValue: 'Priority mix' }), desc: t('landing.analytics.card3Desc', { defaultValue: 'Breakdown by LOW to CRITICAL' }) },
                  { icon: History, title: t('landing.analytics.card4Title', { defaultValue: 'Activity feed' }), desc: t('landing.analytics.card4Desc', { defaultValue: 'Last 20 actions with actor info' }) },
                ].map(({ icon: Icon, title, desc }) => (
                  <div key={title} className="rounded-xl border border-border/60 bg-card/60 p-3">
                    <Icon className="mb-2 h-4 w-4 text-primary" />
                    <p className="text-xs font-semibold text-foreground">{title}</p>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">{desc}</p>
                  </div>
                ))}
              </div>
            </motion.div>
            <motion.div variants={fadeUp}><DashboardMock /></motion.div>
          </motion.div>
        </Section>

        {/* Calendar + Workflow */}
        <Section className="pb-20">
          <div className="grid gap-6 lg:grid-cols-2">
            <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.3 }} className="rounded-2xl border border-border/60 bg-card/60 p-6 backdrop-blur">
              <Pill color="amber"><CalendarDays className="h-3.5 w-3.5" />{t('calendar.title', { defaultValue: 'Calendar' })}</Pill>
              <h3 className="mt-3 text-xl font-bold tracking-tight text-foreground">{t('landing.calendar.title', { defaultValue: 'Plan by deadline, not by column.' })}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{t('landing.calendar.copy', { defaultValue: 'Month and week views surface due dates, overdue markers, and direct navigation to the task project board.' })}</p>
              <div className="mt-4"><ScreenPlaceholder label={t('landing.calendar.screenLabel', { defaultValue: 'Calendar Planning View' })} hint={t('landing.calendar.screenHint', { defaultValue: 'Month/week toggle, due date events, overdue markers' })} aspect="16/9" glow="orange" /></div>
            </motion.div>
            <div className="space-y-6">
              <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.3 }} className="rounded-2xl border border-border/60 bg-card/60 p-6 backdrop-blur">
                <Pill><Layers3 className="h-3.5 w-3.5" />{t('landing.workflow.controls', { defaultValue: 'Workflow Controls' })}</Pill>
                <h3 className="mt-3 text-lg font-bold text-foreground">{t('landing.workflow.title', { defaultValue: 'Structure that fits your team.' })}</h3>
                <div className="mt-4 grid grid-cols-2 gap-2">
                  {[
                    { label: t('landing.workflow.projectStates', { defaultValue: 'Project states' }), items: [t('project.status.active', { defaultValue: 'Active' }), t('project.status.onHold', { defaultValue: 'On hold' }), t('project.status.completed', { defaultValue: 'Completed' }), t('project.status.archived', { defaultValue: 'Archived' })] },
                    { label: t('landing.workflow.taskLanes', { defaultValue: 'Task lanes' }), items: [t('status.todo', { defaultValue: 'To do' }), t('status.inProgress', { defaultValue: 'In progress' }), t('status.review', { defaultValue: 'Review' }), t('status.done', { defaultValue: 'Done' })] },
                    { label: t('landing.workflow.priorities', { defaultValue: 'Priorities' }), items: [t('priority.low', { defaultValue: 'Low' }), t('priority.medium', { defaultValue: 'Medium' }), t('priority.high', { defaultValue: 'High' }), t('priority.critical', { defaultValue: 'Critical' })] },
                    { label: t('landing.workflow.memberRoles', { defaultValue: 'Member roles' }), items: [t('member.roleOwner', { defaultValue: 'Owner' }), t('member.roleAdmin', { defaultValue: 'Admin' }), t('member.roleMember', { defaultValue: 'Member' })] },
                  ].map(({ label, items }) => (
                    <div key={label} className="rounded-xl border border-border/50 bg-background/60 p-3">
                      <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
                      <div className="flex flex-wrap gap-1">{items.map((item) => (<span key={item} className="rounded-md bg-secondary/80 px-1.5 py-0.5 text-[11px] text-muted-foreground">{item}</span>))}</div>
                    </div>
                  ))}
                </div>
              </motion.div>
              <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.3 }} className="rounded-2xl border border-border/60 bg-card/60 p-6 backdrop-blur">
                <Pill color="ai"><Command className="h-3.5 w-3.5" />{t('commandPalette.title', { defaultValue: 'Command Palette' })}</Pill>
                <h3 className="mt-3 text-lg font-bold text-foreground">{t('landing.commandPalette.title', { defaultValue: 'Keyboard-first navigation.' })}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{t('landing.commandPalette.copy', { defaultValue: 'Search projects, tasks, and commands. Jump anywhere instantly with' })} <kbd className="rounded border border-border bg-secondary px-1.5 py-0.5 text-[11px] font-mono">Cmd K</kbd></p>
              </motion.div>
            </div>
          </div>
        </Section>

        {/* Full features grid */}
        <Section className="pb-20" id="features">
          <motion.div initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.1 }} variants={stagger(0.05)}>
            <motion.div variants={fadeUp} className="mb-8">
              <h2 className="text-2xl font-extrabold tracking-tight text-foreground md:text-3xl">{t('landing.features.title', { defaultValue: 'Everything your team needs, already built.' })}</h2>
              <p className="mt-2 text-muted-foreground">{t('landing.features.copy', { defaultValue: 'Every feature below is implemented and live in production.' })}</p>
            </motion.div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {[
                { icon: Bot, title: t('landing.features.card1Title', { defaultValue: 'AI Task Generation' }), copy: t('landing.features.card1Copy', { defaultValue: '7 AI endpoints: generate, improve, subtasks, priority, titles, regenerate sections, confirm.' }), badge: t('landing.nav.ai', { defaultValue: 'AI' }) },
                { icon: Zap, title: t('landing.features.card2Title', { defaultValue: 'WebSocket Events' }), copy: t('landing.features.card2Copy', { defaultValue: 'task:created · task:updated · task:deleted · member events · notifications.' }) },
                { icon: Users, title: t('landing.features.card3Title', { defaultValue: 'Presence Indicators' }), copy: t('landing.features.card3Copy', { defaultValue: 'Live avatars showing teammates in each project room, animated on join/leave.' }) },
                { icon: Columns3, title: t('landing.features.card4Title', { defaultValue: 'Kanban DnD' }), copy: t('landing.features.card4Copy', { defaultValue: 'DnD Kit drag-drop with optimistic updates and cross-member synchronization.' }) },
                { icon: Bell, title: t('landing.features.card5Title', { defaultValue: 'Smart Notifications' }), copy: t('landing.features.card5Copy', { defaultValue: 'Overdue alerts, 24h due reminders, and Monday weekly digest via cron + WebSocket.' }) },
                { icon: CalendarDays, title: t('landing.features.card6Title', { defaultValue: 'Calendar View' }), copy: t('landing.features.card6Copy', { defaultValue: 'FullCalendar month/week, priority colors, overdue states, click-to-navigate.' }) },
                { icon: LineChart, title: t('landing.features.card7Title', { defaultValue: 'Dashboard Analytics' }), copy: t('landing.features.card7Copy', { defaultValue: 'KPIs, timeline (30 days), project overview, status/priority distribution.' }) },
                { icon: MessageSquare, title: t('landing.features.card8Title', { defaultValue: 'Comments and Threads' }), copy: t('landing.features.card8Copy', { defaultValue: 'Per-task comment threads with author, timestamp, and soft-delete.' }) },
                { icon: CheckSquare, title: t('landing.features.card9Title', { defaultValue: 'Subtask Checklists' }), copy: t('landing.features.card9Copy', { defaultValue: 'DnD-sortable subtasks with completion tracking and real-time progress.' }) },
                { icon: History, title: t('landing.features.card10Title', { defaultValue: 'Activity Audit Log' }), copy: t('landing.features.card10Copy', { defaultValue: 'Immutable audit trail for status, assignee, priority, and due date changes.' }) },
                { icon: Lock, title: t('landing.features.card11Title', { defaultValue: 'Role-based Access' }), copy: t('landing.features.card11Copy', { defaultValue: 'Owner to Admin to Member permission layers with revocation broadcast.' }) },
                { icon: Settings2, title: t('landing.features.card12Title', { defaultValue: 'Preferences' }), copy: t('landing.features.card12Copy', { defaultValue: 'Theme, notifications, language, and timezone saved per user.' }) },
              ].map((f) => <FeatureCard key={f.title} {...f} />)}
            </div>
          </motion.div>
        </Section>

        {/* Testimonials */}
        <Section className="pb-20">
          <motion.div initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.2 }} variants={stagger(0.07)}>
            <motion.div variants={fadeUp} className="mb-8">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">{t('landing.testimonials.kicker', { defaultValue: 'From teams using Tasku' })}</p>
              <h2 className="mt-2 text-2xl font-extrabold tracking-tight text-foreground md:text-3xl">{t('landing.testimonials.title', { defaultValue: 'Built by engineers, loved by product teams.' })}</h2>
            </motion.div>
            <div className="grid gap-4 md:grid-cols-3">
              {[
                { quote: t('landing.testimonial1.quote', { defaultValue: 'The AI task generator is the single biggest productivity unlock we have. We describe a feature and the whole breakdown is there in seconds.' }), name: 'Carla M.', role: t('landing.testimonial1.role', { defaultValue: 'Product Lead' }), company: t('landing.testimonial1.company', { defaultValue: 'Fintech Platform' }), initials: 'CM', color: 'from-indigo-500 to-violet-500' },
                { quote: t('landing.testimonial2.quote', { defaultValue: 'The realtime kanban feels like magic. A teammate in another country moves a card and I see it instantly. No refresh. No polling.' }), name: 'Diego R.', role: t('landing.testimonial2.role', { defaultValue: 'Engineering Manager' }), company: t('landing.testimonial2.company', { defaultValue: 'B2B SaaS' }), initials: 'DR', color: 'from-emerald-500 to-teal-500' },
                { quote: t('landing.testimonial3.quote', { defaultValue: 'Dashboard analytics and the activity audit log gave us the operational visibility we previously needed expensive third-party tools for.' }), name: 'Lucia P.', role: t('landing.testimonial3.role', { defaultValue: 'Operations Director' }), company: t('landing.testimonial3.company', { defaultValue: 'Growth Studio' }), initials: 'LP', color: 'from-amber-500 to-orange-500' },
              ].map((t) => (
                <motion.div key={t.name} variants={fadeUp} className="flex flex-col rounded-2xl border border-border/60 bg-card p-5 shadow-sm">
                  <div className="flex-1">
                    <div className="mb-3 flex gap-0.5">
                      {[...Array(5)].map((_, j) => (<svg key={j} className="h-3.5 w-3.5 fill-amber-400 text-amber-400" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>))}
                    </div>
                    <p className="text-sm leading-relaxed text-muted-foreground">"{t.quote}"</p>
                  </div>
                  <div className="mt-4 flex items-center gap-3 border-t border-border/60 pt-4">
                    <div className={`flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br ${t.color} text-xs font-bold text-white`}>{t.initials}</div>
                    <div><p className="text-sm font-semibold text-foreground">{t.name}</p><p className="text-xs text-muted-foreground">{t.role} - {t.company}</p></div>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </Section>

        {/* CTA */}
        <Section className="pb-20">
          <motion.div initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.4 }} transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }} className="relative overflow-hidden rounded-3xl border border-border/60 bg-gradient-to-br from-card via-card to-primary/5 px-8 py-14 shadow-xl md:px-14">
            <div className="absolute inset-0 overflow-hidden rounded-3xl">
              <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-primary/15 blur-3xl" />
              <div className="absolute -bottom-20 -left-20 h-64 w-64 rounded-full bg-violet-500/10 blur-3xl" />
            </div>
            <div className="relative text-center">
              <Pill color="ai"><Sparkles className="h-3.5 w-3.5" />{t('landing.cta.kicker', { defaultValue: 'Start building smarter' })}</Pill>
              <h2 className="mx-auto mt-4 max-w-2xl text-3xl font-extrabold tracking-tight text-foreground md:text-5xl">{t('landing.cta.title', { defaultValue: 'Your team\'s AI execution layer starts here.' })}</h2>
              <p className="mx-auto mt-4 max-w-xl text-base text-muted-foreground">{t('landing.cta.copy', { defaultValue: 'Launch a workspace with AI task generation, realtime collaboration, kanban boards, analytics, and smart notifications in one platform.' })}</p>
              <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
                <button onClick={() => onNavigate('/register')} className="inline-flex h-12 items-center gap-2 rounded-xl bg-primary px-8 text-base font-bold text-primary-foreground shadow-lg shadow-primary/20 transition-all hover:opacity-90 hover:shadow-primary/30 active:scale-[0.98]">
                  <Zap className="h-5 w-5" />{t('landing.hero.getStartedFree', { defaultValue: 'Get Started Free' })}
                </button>
                <button onClick={() => onNavigate('/login')} className="inline-flex h-12 items-center gap-2 rounded-xl border border-border bg-card px-8 text-base font-semibold text-foreground shadow-sm transition-all hover:bg-accent active:scale-[0.98]">
                  {t('landing.cta.viewDemo', { defaultValue: 'View Live Demo' })} <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </motion.div>
        </Section>

        {/* Footer */}
        <footer className="border-t border-border/60 bg-card/40 backdrop-blur">
          <div className="mx-auto w-full max-w-7xl px-5 py-10 md:px-8">
            <div className="grid gap-8 md:grid-cols-[1fr_auto]">
              <div>
                <div className="flex items-center gap-2.5">
                  <img src={isDark ? logoDark : logoLight} alt="Tasku" className="h-7 w-7 object-contain" />
                  <span className="text-sm font-bold text-foreground">Tasku</span>
                </div>
                <p className="mt-2 max-w-xs text-xs leading-relaxed text-muted-foreground">{t('landing.footer.copy', { defaultValue: 'AI-powered project management with realtime collaboration, kanban workflows, and intelligent notifications.' })}</p>
              </div>
              <div className="grid grid-cols-2 gap-8 text-sm sm:grid-cols-3">
                {[
                  { heading: t('landing.footer.product', { defaultValue: 'Product' }), links: [t('projects.dashboard', { defaultValue: 'Dashboard' }), t('projects.title', { defaultValue: 'Projects' }), t('calendar.title', { defaultValue: 'Calendar' }), t('app.settings', { defaultValue: 'Settings' })] },
                  { heading: t('landing.footer.aiFeatures', { defaultValue: 'AI Features' }), links: [t('landing.footer.taskGenerator', { defaultValue: 'Task Generator' }), t('landing.footer.subtaskAi', { defaultValue: 'Subtask AI' }), t('landing.footer.descriptionAi', { defaultValue: 'Description AI' }), t('landing.footer.priorityAi', { defaultValue: 'Priority AI' })] },
                  { heading: t('landing.footer.account', { defaultValue: 'Account' }), links: [t('auth.signInCta', { defaultValue: 'Sign in' }), t('auth.createAccount', { defaultValue: 'Register' }), t('profile.title', { defaultValue: 'Profile' }), t('app.notifications', { defaultValue: 'Notifications' })] },
                ].map((col) => (
                  <div key={col.heading}>
                    <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">{col.heading}</p>
                    <ul className="space-y-2">
                      {col.links.map((link) => (<li key={link}><button onClick={() => onNavigate('/login')} className="text-xs text-muted-foreground transition-colors hover:text-foreground">{link}</button></li>))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
            <div className="mt-8 flex flex-col items-center justify-between gap-3 border-t border-border/60 pt-6 text-xs text-muted-foreground md:flex-row">
              <p>{t('landing.footer.copyright', { defaultValue: '2026 Tasku. All rights reserved.' })}</p>
              <div className="flex flex-wrap items-center gap-4">
                {[{ icon: Sparkles, label: t('landing.footer.badgeAiNative', { defaultValue: 'AI-native' }) }, { icon: Zap, label: t('landing.footer.badgeRealtime', { defaultValue: 'Realtime sync' }) }, { icon: Lock, label: t('landing.footer.badgeRbac', { defaultValue: 'RBAC security' }) }, { icon: Globe, label: t('landing.footer.badgeTimezone', { defaultValue: 'Multi-timezone' }) }].map(({ icon: Icon, label }) => (
                  <span key={label} className="flex items-center gap-1.5"><Icon className="h-3 w-3 text-primary" />{label}</span>
                ))}
              </div>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
