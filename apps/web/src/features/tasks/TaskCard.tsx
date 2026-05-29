import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Calendar, MessageSquare, GripVertical, Flag } from 'lucide-react';
import { motion } from 'framer-motion';

import { Avatar } from '@/components/ui/Avatar';
import { formatDate } from '@/utils/formatters';
import { cn } from '@/utils/cn';
import { type Task } from '@/types/task.types';

const PRIORITY_CONFIG: Record<string, { border: string; bg: string; label: string }> = {
  LOW:      { border: 'border-l-slate-400',   bg: 'bg-slate-400',   label: 'Low' },
  MEDIUM:   { border: 'border-l-amber-400',   bg: 'bg-amber-400',   label: 'Medium' },
  HIGH:     { border: 'border-l-orange-400',  bg: 'bg-orange-400',  label: 'High' },
  CRITICAL: { border: 'border-l-red-500',     bg: 'bg-red-500',     label: 'Critical' },
};

interface TaskCardProps {
  task: Task;
  onClick?: (task: Task) => void;
  isDragging?: boolean;
}

export function TaskCard({ task, onClick, isDragging }: TaskCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging: isSortableDragging } = useSortable({
    id: task.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isSortableDragging ? 0 : 1,
  };

  const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'DONE';
  const priorityConfig = PRIORITY_CONFIG[task.priority] ?? PRIORITY_CONFIG.LOW;

  return (
    <div ref={setNodeRef} style={style} {...attributes}>
      <motion.div
        layout
        initial={{ opacity: 0, scale: 0.98, y: 4 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: -4 }}
        transition={{ duration: 0.15 }}
        className={cn(
          'bg-card border border-border/80 rounded-xl cursor-pointer group',
          'border-l-[3px]', priorityConfig.border,
          'hover:shadow-md hover:border-border transition-all duration-150',
          isDragging && 'card-drag-shadow ring-2 ring-primary/30',
        )}
        style={{
          userSelect: 'none',
        }}
        onClick={() => onClick?.(task)}
      >
        <div className="p-3.5" {...listeners}>
          <div className="flex items-start gap-2">
            {/* Drag handle */}
            <button
              className="mt-0.5 opacity-0 group-hover:opacity-70 hover:!opacity-100 transition-opacity cursor-grab active:cursor-grabbing shrink-0 -ml-1"
              onClick={(e) => e.stopPropagation()}
            >
              <GripVertical className="h-3.5 w-3.5 text-muted-foreground" />
            </button>

            <div className="flex-1 min-w-0">
              {/* Title */}
              <p className="text-sm font-medium leading-snug line-clamp-2 group-hover:text-primary transition-colors">
                {task.title}
              </p>

              <div className="mt-1 inline-flex items-center gap-1 rounded-full border border-border/70 bg-secondary/40 px-1.5 py-0.5 text-[10px] text-muted-foreground">
                <Flag className="h-2.5 w-2.5" />
                {priorityConfig.label}
              </div>

              {/* Tags */}
              {task.tags && task.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1.5">
                  {task.tags.slice(0, 3).map((tag) => (
                    <span
                      key={tag}
                      className="text-[10px] bg-secondary px-1.5 py-0.5 rounded-full text-muted-foreground font-medium"
                    >
                      {tag}
                    </span>
                  ))}
                  {task.tags.length > 3 && (
                    <span className="text-[10px] text-muted-foreground">+{task.tags.length - 3}</span>
                  )}
                </div>
              )}

              {/* Footer */}
              <div className="flex items-center justify-between mt-2.5 gap-2 border-t border-border/60 pt-2.5">
                <div className="flex items-center gap-2.5 text-xs text-muted-foreground min-w-0">
                  {task.dueDate && (
                    <span
                      className={cn(
                        'flex items-center gap-0.5 shrink-0',
                        isOverdue ? 'text-destructive font-medium' : '',
                      )}
                    >
                      <Calendar className="h-3 w-3" />
                      {formatDate(task.dueDate)}
                    </span>
                  )}
                  {(task._count?.comments ?? 0) > 0 && (
                    <span className="inline-flex items-center gap-0.5 shrink-0 rounded-full bg-secondary/70 px-1.5 py-0.5">
                      <MessageSquare className="h-3 w-3" />
                      {task._count!.comments}
                    </span>
                  )}
                </div>

                {task.assignee && (
                  <Avatar
                    src={task.assignee.avatar}
                    firstName={task.assignee.firstName}
                    lastName={task.assignee.lastName}
                    size="xs"
                    className="shrink-0"
                  />
                )}
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

