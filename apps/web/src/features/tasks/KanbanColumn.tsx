import { useState, useRef, useEffect } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Plus, MoreHorizontal } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';

import { TaskCard } from './TaskCard';
import { cn } from '@/utils/cn';
import { type Task } from '@/types/task.types';

const COLUMN_CONFIG: Record<string, { label: string; color: string; accent: string; dot: string }> = {
  TODO:        { label: 'To do',       color: 'text-slate-400',   accent: 'border-slate-400/30',   dot: 'bg-slate-400' },
  IN_PROGRESS: { label: 'In progress', color: 'text-blue-400',    accent: 'border-blue-400/30',    dot: 'bg-blue-400' },
  REVIEW:      { label: 'Review',      color: 'text-amber-400',   accent: 'border-amber-400/30',   dot: 'bg-amber-400' },
  DONE:        { label: 'Done',        color: 'text-emerald-400', accent: 'border-emerald-400/30', dot: 'bg-emerald-400' },
};

interface KanbanColumnProps {
  id: string;
  title: string;
  tasks: Task[];
  onTaskClick?: (task: Task) => void;
  onAddTask?: (status: string) => void;
  onQuickAdd?: (status: string, title: string) => void;
}

export function KanbanColumn({ id, title, tasks, onTaskClick, onAddTask, onQuickAdd }: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id });
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [quickTitle, setQuickTitle] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const config = COLUMN_CONFIG[id] ?? { label: title, color: 'text-muted-foreground', accent: 'border-border', dot: 'bg-muted-foreground' };

  useEffect(() => {
    if (quickAddOpen) inputRef.current?.focus();
  }, [quickAddOpen]);

  const handleQuickAdd = () => {
    const trimmed = quickTitle.trim();
    if (trimmed) {
      onQuickAdd?.(id, trimmed);
    }
    setQuickTitle('');
    setQuickAddOpen(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleQuickAdd();
    if (e.key === 'Escape') { setQuickTitle(''); setQuickAddOpen(false); }
  };

  return (
    <div className="flex flex-col min-w-[272px] w-[272px]">
      {/* Column header */}
      <div className={cn(
        'flex items-center justify-between mb-2.5 px-3 py-2.5 rounded-t-xl',
        'bg-card border border-border border-b-0',
        'border-t-2', config.accent,
      )}>
        <div className="flex items-center gap-2">
          <span className={cn('w-2 h-2 rounded-full shrink-0', config.dot)} />
          <span className="text-xs font-semibold text-foreground">{config.label}</span>
          <span className={cn(
            'text-[11px] font-medium px-1.5 py-0.5 rounded-full tabular-nums',
            'bg-secondary text-muted-foreground',
          )}>
            {tasks.length}
          </span>
        </div>

        <div className="flex items-center gap-0.5">
          <button
            onClick={() => setQuickAddOpen((v) => !v)}
            className="h-6 w-6 flex items-center justify-center rounded hover:bg-accent transition-colors text-muted-foreground hover:text-foreground"
            title={`Quick add to ${config.label}`}
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
          {onAddTask && (
            <button
              onClick={() => onAddTask(id)}
              className="h-6 w-6 flex items-center justify-center rounded hover:bg-accent transition-colors text-muted-foreground hover:text-foreground"
              title="Add task with form"
            >
              <MoreHorizontal className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Drop zone */}
      <SortableContext items={tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
        <div
          ref={setNodeRef}
          className={cn(
            'flex-1 rounded-b-xl px-2 pb-2 pt-2 min-h-[200px] transition-all duration-150 space-y-2',
            'bg-card border border-border border-t-0',
            isOver ? 'bg-primary/5 ring-2 ring-inset ring-primary/20' : '',
          )}
        >
          <AnimatePresence initial={false}>
            {tasks.map((task) => (
              <TaskCard key={task.id} task={task} onClick={onTaskClick} />
            ))}
          </AnimatePresence>

          {/* Quick add inline */}
          <AnimatePresence>
            {quickAddOpen && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="bg-card border border-primary/40 rounded-lg p-2.5 shadow-sm">
                  <input
                    ref={inputRef}
                    value={quickTitle}
                    onChange={(e) => setQuickTitle(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Task name…"
                    className="w-full text-sm bg-transparent outline-none placeholder:text-muted-foreground"
                  />
                  <div className="flex gap-1.5 mt-2">
                    <button
                      onClick={handleQuickAdd}
                      disabled={!quickTitle.trim()}
                      className="flex-1 h-6 text-xs rounded bg-primary text-primary-foreground disabled:opacity-40 transition-opacity"
                    >
                      Add
                    </button>
                    <button
                      onClick={() => { setQuickTitle(''); setQuickAddOpen(false); }}
                      className="flex-1 h-6 text-xs rounded bg-secondary text-secondary-foreground"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {tasks.length === 0 && !quickAddOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center justify-center h-24 gap-2"
            >
              <p className="text-xs text-muted-foreground/60">No tasks</p>
              <button
                onClick={() => setQuickAddOpen(true)}
                className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
              >
                <Plus className="h-3 w-3" /> Add task
              </button>
            </motion.div>
          )}
        </div>
      </SortableContext>
    </div>
  );
}

