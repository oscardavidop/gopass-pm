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
    ai:      'border-primary/40 bg-primary/10 text-primary',
    green:   'border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
    amber:   'border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-400',
    red:     'border-red-500/40 bg-red-500/10 text-red-500',
  };
  return <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-medium ${colorMap[color]}`}>{children}</span>;
}

function ScreenPlaceholder({ label, hint, aspect = '16/9', glow = 'primary', className = '' }: {
  label: string; hint?: string; aspect?: string; glow?: 'primary' | 'ai' | 'orange'; className?: string;
}) {
  const glowMap: Record<string, string> = {
    primary: 'rgba(99,102,241,0.28)',
    ai:      'rgba(168,85,247,0.28)',
    orange:  'rgba(251,146,60,0.22)',
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

function LandingNavbar({ onNavigate }: { onNavigate: (to: string) => void }) {
  const { isDark, toggleTheme } = useTheme();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 12);
    window.addEventListener('scroll', handler, { passive: true });
    return () => window.removeEventListener('scroll', handler);
  }, []);

  const navLinks = [
    { label: 'Features', href: '#features' },
    { label: 'AI', href: '#ai' },
    { label: 'Collaboration', href: '#collab' },
    { label: 'Analytics', href: '#analytics' },
  ];

  return (
    <header className={`sticky top-0 z-50 w-full transition-all duration-300 ${scrolled ? 'border-b border-border/60 bg-background/90 backdrop-blur-xl shadow-sm' : 'bg-transparent'}`}>
      <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between px-5 md:px-8">
        <button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} className="flex items-center gap-2.5">
          <img src={isDark ? logoDark : logoLight} alt="Tasku" className="h-8 w-8 object-contain" />
          <span className="text-base font-bold tracking-tight text-foreground">Tasku</span>
        </button>
        <nav className="hidden items-center gap-1 md:flex">
          {navLinks.map((link) => (
            <a key={link.label} href={link.href} className="rounded-lg px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground">{link.label}</a>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <button onClick={toggleTheme} className="flex h-9 w-9 items-center justify-center rounded-lg border border-border/70 bg-card text-muted-foreground transition-colors hover:bg-accent hover:text-foreground" title="Toggle theme">
            {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>
          <button onClick={() => onNavigate('/login')} className="hidden rounded-lg px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground md:block">Sign in</button>
          <button onClick={() => onNavigate('/register')} className="hidden h-9 items-center gap-1.5 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-sm transition-all hover:opacity-90 active:scale-[0.98] md:flex">
            Get Started <ArrowRight className="h-3.5 w-3.5" />
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
                <button onClick={() => { onNavigate('/login'); setMenuOpen(false); }} className="rounded-lg border border-border py-2 text-sm font-medium text-foreground hover:bg-accent">Sign in</button>
                <button onClick={() => { onNavigate('/register'); setMenuOpen(false); }} className="rounded-lg bg-primary py-2 text-sm font-semibold text-primary-foreground">Get Started</button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}

function AiTaskMock() {
  const [stage, setStage] = useState<'input' | 'loading' | 'result'>('input');
  const [loadingIdx, setLoadingIdx] = useState(0);
  const loadingSteps = ['Analyzing project context...', 'Generating subtasks...', 'Creating acceptance criteria...', 'Estimating effort...'];

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
          <span className="text-xs font-semibold text-foreground">AI Task Generator</span>
          <Pill color="ai"><Bot className="h-3 w-3" />Workers AI</Pill>
        </div>
        <button onClick={() => setStage('input')} className="flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"><RefreshCw className="h-3 w-3" /></button>
      </div>
      <div className="p-4 space-y-3">
        <div className="space-y-2">
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Describe your task idea</label>
          <div className="flex min-h-[40px] w-full items-center gap-2 rounded-xl border border-border/80 bg-background/70 px-3 py-2 text-sm">
            <Wand2 className="h-3.5 w-3.5 shrink-0 text-primary" />
            <span className={stage === 'input' ? 'text-foreground' : 'text-muted-foreground'}>Build payment system with Stripe integration</span>
          </div>
        </div>
        {stage === 'input' && (
          <button onClick={handleGenerate} className="flex h-9 w-full items-center justify-center gap-2 rounded-xl bg-primary text-sm font-semibold text-primary-foreground shadow-sm transition-all hover:opacity-90 active:scale-[0.98]">
            <Sparkles className="h-3.5 w-3.5" /> Generate with AI
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
                  <p className="text-sm font-semibold text-foreground leading-snug">Integrate Stripe Payment Gateway</p>
                  <Pill color="red"><Flag className="h-3 w-3" />HIGH</Pill>
                </div>
                <p className="text-xs text-muted-foreground line-clamp-2">Implement end-to-end Stripe payment processing with webhook handling, idempotent charge operations, and PCI-compliant card collection via Stripe Elements.</p>
                <div className="flex flex-wrap gap-2">
                  <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground"><Clock3 className="h-3 w-3" /> 14h estimated</span>
                  <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground"><Layers3 className="h-3 w-3" /> HIGH complexity</span>
                </div>
                <div className="flex flex-wrap gap-1">
                  {['backend', 'payments', 'api', 'security'].map((tag) => (
                    <span key={tag} className="rounded-full border border-border/70 bg-secondary/70 px-2 py-0.5 text-[10px] text-muted-foreground">{tag}</span>
                  ))}
                </div>
              </div>
              <div className="space-y-1">
                <p className="flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground"><CheckSquare className="h-3 w-3" /> Subtasks (4)</p>
                {['Set up Stripe SDK and environment keys', 'Implement payment intent creation endpoint', 'Build webhook handler with signature verification', 'Add error recovery and idempotency keys'].map((st, i) => (
                  <div key={i} className="flex items-center gap-2 rounded-lg border border-border/50 bg-background/60 px-2.5 py-1.5 text-xs text-muted-foreground">
                    <span className="h-4 w-4 shrink-0 rounded border border-border bg-background text-[9px] flex items-center justify-center text-muted-foreground/50">{i + 1}</span>
                    {st}
                  </div>
                ))}
              </div>
              <button className="flex h-8 w-full items-center justify-center gap-1.5 rounded-xl bg-emerald-600/90 text-xs font-semibold text-white transition-all hover:bg-emerald-600 active:scale-[0.98]">
                <CheckCircle2 className="h-3.5 w-3.5" /> Confirm &amp; Create Task
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function KanbanMock() {
  const columns = [
    { id: 'todo', label: 'To do', dot: 'bg-slate-400', cards: [{ title: 'API rate limiting', priority: 'MEDIUM', tag: 'backend', ai: false }, { title: 'Payment flow', priority: 'HIGH', tag: 'payments', ai: true }] },
    { id: 'inprog', label: 'In progress', dot: 'bg-blue-400', cards: [{ title: 'Auth token refresh', priority: 'HIGH', tag: 'auth', ai: false }, { title: 'Dashboard charts', priority: 'MEDIUM', tag: 'frontend', ai: true }] },
    { id: 'review', label: 'Review', dot: 'bg-amber-400', cards: [{ title: 'Webhook handler', priority: 'CRITICAL', tag: 'backend', ai: true }] },
    { id: 'done', label: 'Done', dot: 'bg-emerald-400', cards: [{ title: 'User registration', priority: 'LOW', tag: 'auth', ai: false }, { title: 'Email templates', priority: 'LOW', tag: 'comms', ai: false }] },
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
  const users = [
    { name: 'Carlos M.', color: 'from-indigo-500 to-violet-500', action: 'moved task to Review' },
    { name: 'Laura P.', color: 'from-emerald-500 to-teal-500', action: 'added comment on Auth task' },
    { name: 'Diego R.', color: 'from-amber-500 to-orange-500', action: 'created AI task' },
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
        <div><p className="text-xs font-semibold text-foreground">5 teammates online now</p><p className="text-[11px] text-muted-foreground">All viewing Project Alpha</p></div>
        <span className="ml-auto flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-1 text-[11px] text-emerald-600 dark:text-emerald-400">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />Live
        </span>
      </div>
      <div className="space-y-2">
        {users.map((u, i) => (
          <motion.div key={i} initial={{ opacity: 0, x: -12 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }} className="flex items-center gap-3 rounded-xl border border-border/50 bg-card/60 px-3 py-2.5">
            <div className={`h-7 w-7 shrink-0 rounded-full bg-gradient-to-br ${u.color} flex items-center justify-center text-[11px] font-bold text-white`}>{u.name[0]}</div>
            <div className="min-w-0 flex-1"><span className="text-xs font-medium text-foreground">{u.name}</span><span className="text-xs text-muted-foreground"> {u.action}</span></div>
            <span className="text-[10px] text-muted-foreground/60">now</span>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

function DashboardMock() {
  const kpis = [
    { label: 'Total tasks', value: '184', delta: '+12', color: 'text-foreground' },
    { label: 'Completed', value: '118', delta: '+8', color: 'text-emerald-600 dark:text-emerald-400' },
    { label: 'Overdue', value: '7', delta: '-3', color: 'text-red-500' },
    { label: 'Completion', value: '64%', delta: '+5%', color: 'text-primary' },
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
            <p className="text-[10px] text-emerald-500">{kpi.delta} this week</p>
          </motion.div>
        ))}
      </div>
      <div className="rounded-2xl border border-border/60 bg-card p-4">
        <p className="mb-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Project Progress</p>
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
        <LandingNavbar onNavigate={onNavigate} />

        {/* Hero */}
        <Section className="pb-12 pt-16 md:pb-20 md:pt-24">
          <motion.div variants={stagger(0.09)} initial="hidden" animate="show" className="grid items-center gap-12 lg:grid-cols-[1.1fr_1fr]">
            <div className="space-y-7">
              <motion.div variants={fadeUp}>
                <span className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/[0.08] px-3 py-1.5 text-xs font-semibold text-primary backdrop-blur">
                  <Sparkles className="h-3.5 w-3.5" />
                  AI-powered project management &middot; realtime collaboration
                </span>
              </motion.div>
              <motion.h1 variants={fadeUp} className="text-[2.6rem] font-extrabold leading-[1.04] tracking-tight text-foreground md:text-6xl lg:text-[3.5rem] xl:text-6xl">
                Intelligent workflows{' '}
                <span className="bg-gradient-to-r from-primary to-violet-400 bg-clip-text text-transparent">built for speed.</span>
              </motion.h1>
              <motion.p variants={fadeUp} className="max-w-lg text-base leading-relaxed text-muted-foreground md:text-lg">
                Tasku combines AI task generation, realtime collaboration, and dynamic kanban to give teams the fastest path from idea to execution.
              </motion.p>
              <motion.div variants={fadeUp} className="flex flex-wrap items-center gap-3">
                <button onClick={() => onNavigate('/register')} className="inline-flex h-11 items-center gap-2 rounded-xl bg-primary px-6 text-sm font-semibold text-primary-foreground shadow-sm transition-all hover:opacity-90 active:scale-[0.98]">
                  Get Started Free <ArrowRight className="h-4 w-4" />
                </button>
                <button onClick={() => onNavigate('/login')} className="inline-flex h-11 items-center gap-2 rounded-xl border border-border bg-card px-6 text-sm font-medium text-foreground shadow-sm transition-all hover:bg-accent active:scale-[0.98]">
                  Explore the Dashboard
                </button>
              </motion.div>
              <motion.div variants={fadeIn} className="flex flex-wrap gap-4 pt-1 text-xs text-muted-foreground">
                {[{ icon: Sparkles, text: '7 AI capabilities' }, { icon: Zap, text: 'Realtime WebSocket sync' }, { icon: Lock, text: 'Role-based access control' }].map(({ icon: Icon, text }) => (
                  <span key={text} className="flex items-center gap-1.5"><Icon className="h-3.5 w-3.5 text-primary" />{text}</span>
                ))}
              </motion.div>
            </div>
            <motion.div variants={fadeUp} className="relative">
              <div className="absolute -inset-6 rounded-[2rem] bg-gradient-to-br from-primary/15 via-violet-500/10 to-transparent blur-2xl" />
              <div className="relative rounded-[1.6rem] border border-border/60 bg-card/60 p-3 shadow-2xl backdrop-blur-sm">
                <ScreenPlaceholder label="Dashboard Preview" hint="KPIs, completion charts, activity feed, project overview" aspect="4/3" glow="primary" />
              </div>
            </motion.div>
          </motion.div>
        </Section>

        {/* Stats bar */}
        <Section className="pb-16">
          <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.4 }} className="grid grid-cols-2 gap-3 rounded-2xl border border-border/60 bg-card/60 p-3 backdrop-blur md:grid-cols-4">
            {[
              { value: '7+', label: 'AI endpoints', sub: 'generate · improve · suggest' },
              { value: 'Realtime', label: 'WebSocket sync', sub: 'task · presence · notify' },
              { value: '4 lanes', label: 'Dynamic kanban', sub: 'drag · drop · live update' },
              { value: '30-day', label: 'Timeline analytics', sub: 'created · done · overdue' },
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
              <Pill color="ai"><Bot className="h-3.5 w-3.5" />AI-Powered</Pill>
              <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-foreground md:text-4xl">From idea to task in seconds.</h2>
              <p className="mt-3 max-w-2xl text-base text-muted-foreground">Describe what you need. The AI generates the complete task &mdash; title, description, subtasks, acceptance criteria, priority, effort estimate, and labels &mdash; grounded in your project context and team.</p>
            </motion.div>
            <div className="grid gap-8 lg:grid-cols-[1fr_1fr]">
              <motion.div variants={fadeUp}><AiTaskMock /></motion.div>
              <motion.div variants={stagger(0.06)} className="grid gap-3 sm:grid-cols-2">
                {[
                  { icon: Wand2, title: 'Task Generation', copy: 'Full task from a one-line idea: title, description, subtasks, criteria.', badge: 'Core' },
                  { icon: Layers3, title: 'Subtask Breakdown', copy: 'Automatic implementation subtasks ordered for delivery.' },
                  { icon: MessageSquare, title: 'Description Improve', copy: 'Rewrites your draft with precision, clarity, and engineering focus.' },
                  { icon: Flag, title: 'Priority Suggestion', copy: 'AI infers urgency, complexity, and effort from context and due date.' },
                  { icon: Tags, title: 'Title Suggestions', copy: 'Multiple concise, actionable title options generated instantly.' },
                  { icon: RefreshCw, title: 'Section Regenerate', copy: 'Regenerate labels, criteria, or subtasks independently.' },
                ].map((f) => <FeatureCard key={f.title} {...f} />)}
              </motion.div>
            </div>
          </motion.div>
        </Section>

        {/* Realtime */}
        <Section className="pb-20" id="collab">
          <motion.div variants={stagger(0.08)} initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.15 }} className="grid items-start gap-12 lg:grid-cols-2">
            <motion.div variants={fadeUp}>
              <Pill color="green"><Zap className="h-3.5 w-3.5" />Realtime</Pill>
              <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-foreground md:text-4xl">Every change, everywhere, <span className="text-emerald-500 dark:text-emerald-400">instantly.</span></h2>
              <p className="mt-3 max-w-lg text-base text-muted-foreground">WebSocket-powered room events keep your entire team in sync. No manual refresh. No stale data. Every task update, member join, and notification pushed live to all connected users.</p>
              <div className="mt-6 space-y-3">
                {[
                  { icon: Zap, label: 'Task events', desc: 'created · updated · deleted — instant across all members' },
                  { icon: Users, label: 'Presence system', desc: 'See who is online and viewing each project in real time' },
                  { icon: BellRing, label: 'Smart notifications', desc: 'Overdue alerts, due reminders, weekly digest — server-pushed' },
                  { icon: History, label: 'Activity audit log', desc: 'Complete history of task changes with actor and timestamp' },
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
                <Pill><Columns3 className="h-3.5 w-3.5" />Kanban Workflows</Pill>
                <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-foreground md:text-4xl">Boards that move with your team.</h2>
                <p className="mt-3 max-w-xl text-base text-muted-foreground">Drag and drop tasks across live lanes. Built on DnD Kit with optimistic updates and instant WebSocket propagation to all project members.</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {(['To do', 'In progress', 'Review', 'Done'] as const).map((s, i) => (
                  <Pill key={s} color={(['default', 'ai', 'amber', 'green'] as const)[i]}>{s}</Pill>
                ))}
              </div>
            </motion.div>
            <motion.div variants={fadeUp}>
              <div className="rounded-2xl border border-border/60 bg-card/60 p-4 backdrop-blur"><KanbanMock /></div>
            </motion.div>
            <motion.div variants={stagger(0.07)} className="mt-6 grid gap-3 sm:grid-cols-3">
              {[
                { icon: Sparkles, title: 'AI-generated tasks', copy: 'Spark icon marks tasks created by AI — always visible in context.' },
                { icon: Flag, title: 'Priority indicators', copy: 'Left-edge color borders signal LOW, MEDIUM, HIGH, CRITICAL urgency.' },
                { icon: Users, title: 'Assignee avatars', copy: 'Member assignment visible inline on every card without opening.' },
              ].map((f) => <FeatureCard key={f.title} {...f} />)}
            </motion.div>
          </motion.div>
        </Section>

        {/* Analytics */}
        <Section className="pb-20" id="analytics">
          <motion.div initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.15 }} variants={stagger(0.08)} className="grid items-start gap-12 lg:grid-cols-[1fr_1fr]">
            <motion.div variants={fadeUp}>
              <Pill color="ai"><LineChart className="h-3.5 w-3.5" />Analytics</Pill>
              <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-foreground md:text-4xl">Operational clarity at a glance.</h2>
              <p className="mt-3 max-w-lg text-base text-muted-foreground">Live KPIs, 30-day task timeline, project completion rates, workload distribution, and priority mix &mdash; all updated in real time.</p>
              <div className="mt-6 grid grid-cols-2 gap-3">
                {[
                  { icon: Gauge, title: 'Completion rate', desc: 'Done vs total with trend delta' },
                  { icon: LineChart, title: '30-day timeline', desc: 'Created vs completed per day' },
                  { icon: Radar, title: 'Priority mix', desc: 'Breakdown by LOW to CRITICAL' },
                  { icon: History, title: 'Activity feed', desc: 'Last 20 actions with actor info' },
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
              <Pill color="amber"><CalendarDays className="h-3.5 w-3.5" />Calendar</Pill>
              <h3 className="mt-3 text-xl font-bold tracking-tight text-foreground">Plan by deadline, not by column.</h3>
              <p className="mt-2 text-sm text-muted-foreground">Month and week views surface due dates, overdue markers, and direct navigation to the task project board.</p>
              <div className="mt-4"><ScreenPlaceholder label="Calendar Planning View" hint="Month/week toggle, due date events, overdue markers" aspect="16/9" glow="orange" /></div>
            </motion.div>
            <div className="space-y-6">
              <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.3 }} className="rounded-2xl border border-border/60 bg-card/60 p-6 backdrop-blur">
                <Pill><Layers3 className="h-3.5 w-3.5" />Workflow Controls</Pill>
                <h3 className="mt-3 text-lg font-bold text-foreground">Structure that fits your team.</h3>
                <div className="mt-4 grid grid-cols-2 gap-2">
                  {[
                    { label: 'Project states', items: ['Active', 'On hold', 'Completed', 'Archived'] },
                    { label: 'Task lanes', items: ['To do', 'In progress', 'Review', 'Done'] },
                    { label: 'Priorities', items: ['Low', 'Medium', 'High', 'Critical'] },
                    { label: 'Member roles', items: ['Owner', 'Admin', 'Member'] },
                  ].map(({ label, items }) => (
                    <div key={label} className="rounded-xl border border-border/50 bg-background/60 p-3">
                      <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
                      <div className="flex flex-wrap gap-1">{items.map((item) => (<span key={item} className="rounded-md bg-secondary/80 px-1.5 py-0.5 text-[11px] text-muted-foreground">{item}</span>))}</div>
                    </div>
                  ))}
                </div>
              </motion.div>
              <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.3 }} className="rounded-2xl border border-border/60 bg-card/60 p-6 backdrop-blur">
                <Pill color="ai"><Command className="h-3.5 w-3.5" />Command Palette</Pill>
                <h3 className="mt-3 text-lg font-bold text-foreground">Keyboard-first navigation.</h3>
                <p className="mt-1 text-sm text-muted-foreground">Search projects, tasks, and commands. Jump anywhere instantly with <kbd className="rounded border border-border bg-secondary px-1.5 py-0.5 text-[11px] font-mono">Cmd K</kbd></p>
              </motion.div>
            </div>
          </div>
        </Section>

        {/* Full features grid */}
        <Section className="pb-20" id="features">
          <motion.div initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.1 }} variants={stagger(0.05)}>
            <motion.div variants={fadeUp} className="mb-8">
              <h2 className="text-2xl font-extrabold tracking-tight text-foreground md:text-3xl">Everything your team needs, already built.</h2>
              <p className="mt-2 text-muted-foreground">Every feature below is implemented and live in production.</p>
            </motion.div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {[
                { icon: Bot, title: 'AI Task Generation', copy: '7 AI endpoints: generate, improve, subtasks, priority, titles, regenerate sections, confirm.', badge: 'AI' },
                { icon: Zap, title: 'WebSocket Events', copy: 'task:created · task:updated · task:deleted · member events · notifications.' },
                { icon: Users, title: 'Presence Indicators', copy: 'Live avatars showing teammates in each project room, animated on join/leave.' },
                { icon: Columns3, title: 'Kanban DnD', copy: 'DnD Kit drag-drop with optimistic updates and cross-member synchronization.' },
                { icon: Bell, title: 'Smart Notifications', copy: 'Overdue alerts, 24h due reminders, and Monday weekly digest via cron + WebSocket.' },
                { icon: CalendarDays, title: 'Calendar View', copy: 'FullCalendar month/week, priority colors, overdue states, click-to-navigate.' },
                { icon: LineChart, title: 'Dashboard Analytics', copy: 'KPIs, timeline (30 days), project overview, status/priority distribution.' },
                { icon: MessageSquare, title: 'Comments and Threads', copy: 'Per-task comment threads with author, timestamp, and soft-delete.' },
                { icon: CheckSquare, title: 'Subtask Checklists', copy: 'DnD-sortable subtasks with completion tracking and real-time progress.' },
                { icon: History, title: 'Activity Audit Log', copy: 'Immutable audit trail for status, assignee, priority, and due date changes.' },
                { icon: Lock, title: 'Role-based Access', copy: 'Owner to Admin to Member permission layers with revocation broadcast.' },
                { icon: Settings2, title: 'Preferences', copy: 'Theme, notifications, language, and timezone saved per user.' },
              ].map((f) => <FeatureCard key={f.title} {...f} />)}
            </div>
          </motion.div>
        </Section>

        {/* Testimonials */}
        <Section className="pb-20">
          <motion.div initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.2 }} variants={stagger(0.07)}>
            <motion.div variants={fadeUp} className="mb-8">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">From teams using Tasku</p>
              <h2 className="mt-2 text-2xl font-extrabold tracking-tight text-foreground md:text-3xl">Built by engineers, loved by product teams.</h2>
            </motion.div>
            <div className="grid gap-4 md:grid-cols-3">
              {[
                { quote: 'The AI task generator is the single biggest productivity unlock we have. We describe a feature and the whole breakdown is there in seconds.', name: 'Carla M.', role: 'Product Lead', company: 'Fintech Platform', initials: 'CM', color: 'from-indigo-500 to-violet-500' },
                { quote: 'The realtime kanban feels like magic. A teammate in another country moves a card and I see it instantly. No refresh. No polling.', name: 'Diego R.', role: 'Engineering Manager', company: 'B2B SaaS', initials: 'DR', color: 'from-emerald-500 to-teal-500' },
                { quote: 'Dashboard analytics and the activity audit log gave us the operational visibility we previously needed expensive third-party tools for.', name: 'Lucia P.', role: 'Operations Director', company: 'Growth Studio', initials: 'LP', color: 'from-amber-500 to-orange-500' },
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
              <Pill color="ai"><Sparkles className="h-3.5 w-3.5" />Start building smarter</Pill>
              <h2 className="mx-auto mt-4 max-w-2xl text-3xl font-extrabold tracking-tight text-foreground md:text-5xl">Your team's AI execution layer starts here.</h2>
              <p className="mx-auto mt-4 max-w-xl text-base text-muted-foreground">Launch a workspace with AI task generation, realtime collaboration, kanban boards, analytics, and smart notifications in one platform.</p>
              <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
                <button onClick={() => onNavigate('/register')} className="inline-flex h-12 items-center gap-2 rounded-xl bg-primary px-8 text-base font-bold text-primary-foreground shadow-lg shadow-primary/20 transition-all hover:opacity-90 hover:shadow-primary/30 active:scale-[0.98]">
                  <Zap className="h-5 w-5" />Get Started Free
                </button>
                <button onClick={() => onNavigate('/login')} className="inline-flex h-12 items-center gap-2 rounded-xl border border-border bg-card px-8 text-base font-semibold text-foreground shadow-sm transition-all hover:bg-accent active:scale-[0.98]">
                  View Live Demo <ChevronRight className="h-4 w-4" />
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
                <p className="mt-2 max-w-xs text-xs leading-relaxed text-muted-foreground">AI-powered project management with realtime collaboration, kanban workflows, and intelligent notifications.</p>
              </div>
              <div className="grid grid-cols-2 gap-8 text-sm sm:grid-cols-3">
                {[
                  { heading: 'Product', links: ['Dashboard', 'Projects', 'Calendar', 'Settings'] },
                  { heading: 'AI Features', links: ['Task Generator', 'Subtask AI', 'Description AI', 'Priority AI'] },
                  { heading: 'Account', links: ['Sign in', 'Register', 'Profile', 'Notifications'] },
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
              <p>2025 Tasku Workspace. All rights reserved.</p>
              <div className="flex flex-wrap items-center gap-4">
                {[{ icon: Sparkles, label: 'AI-native' }, { icon: Zap, label: 'Realtime sync' }, { icon: Lock, label: 'RBAC security' }, { icon: Globe, label: 'Multi-timezone' }].map(({ icon: Icon, label }) => (
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
