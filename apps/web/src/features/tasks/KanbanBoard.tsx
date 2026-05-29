import { useState, useCallback, useMemo } from 'react';
import {
  DndContext,
  DragOverlay,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  closestCorners,
  type DragStartEvent,
  type DragEndEvent,
  type DragOverEvent,
} from '@dnd-kit/core';
import { arrayMove } from '@dnd-kit/sortable';

import { KanbanColumn } from './KanbanColumn';
import { TaskCard } from './TaskCard';
import { useUpdateTaskStatus } from '@/hooks/useTasks';
import { type Task } from '@/types/task.types';

const COLUMNS = [
  { id: 'TODO', title: 'To do' },
  { id: 'IN_PROGRESS', title: 'In progress' },
  { id: 'REVIEW', title: 'Review' },
  { id: 'DONE', title: 'Done' },
] as const;

interface KanbanBoardProps {
  tasks: Task[];
  onTaskClick?: (task: Task) => void;
  onAddTask?: (status: string) => void;
  onQuickAdd?: (status: string, title: string) => void;
}

export function KanbanBoard({ tasks, onTaskClick, onAddTask, onQuickAdd }: KanbanBoardProps) {
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [localOrder, setLocalOrder] = useState<Record<string, string[]>>({});
  /** Tracks tasks that have been dragged cross-column but not yet confirmed by server */
  const [localStatus, setLocalStatus] = useState<Record<string, Task['status']>>({});

  const updateStatus = useUpdateTaskStatus();

  const sensors = useSensors(
    useSensor(MouseSensor, {
      activationConstraint: {
        // Require 8px of movement before drag starts — prevents accidental drag on click
        distance: 8,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        // 250ms hold OR 8px distance on touch
        delay: 250,
        tolerance: 8,
      },
    }),
  );

  const columns = useMemo(() => {
    const grouped: Record<string, Task[]> = { TODO: [], IN_PROGRESS: [], REVIEW: [], DONE: [] };
    tasks.forEach((task) => {
      // Use local override status if this task was dragged but server hasn't confirmed yet
      const effectiveStatus = localStatus[task.id] ?? task.status;
      if (grouped[effectiveStatus]) grouped[effectiveStatus].push({ ...task, status: effectiveStatus });
    });

    Object.keys(grouped).forEach((status) => {
      const order = localOrder[status];
      if (order?.length) {
        grouped[status] = order
          .map((id) => grouped[status].find((t) => t.id === id))
          .filter(Boolean) as Task[];
        const missing = grouped[status].filter((t) => !order.includes(t.id));
        grouped[status] = [...grouped[status], ...missing];
      }
    });

    return grouped;
  }, [tasks, localOrder]);

  const handleDragStart = useCallback(({ active }: DragStartEvent) => {
    const task = tasks.find((t) => t.id === active.id);
    setActiveTask(task ?? null);
  }, [tasks]);

  const handleDragOver = useCallback(({ active, over }: DragOverEvent) => {
    if (!over) return;
    const overId = over.id as string;
    const taskId = active.id as string;
    const sourceStatus = localStatus[taskId] ?? tasks.find((t) => t.id === taskId)?.status;
    const destStatus =
      COLUMNS.find((c) => c.id === overId)?.id ??
      (localStatus[tasks.find((t) => t.id === overId)?.id ?? ''] ?? tasks.find((t) => t.id === overId)?.status);

    if (!sourceStatus || !destStatus || sourceStatus === destStatus) return;

    // Optimistically update the task's status for the columns memo
    setLocalStatus((prev) => ({ ...prev, [taskId]: destStatus as Task['status'] }));

    setLocalOrder((prev) => {
      const srcOrder = prev[sourceStatus] ?? columns[sourceStatus].map((t) => t.id);
      const dstOrder = prev[destStatus] ?? columns[destStatus].map((t) => t.id);
      const newSrc = srcOrder.filter((id) => id !== taskId);
      const overIndex = dstOrder.findIndex((id) => id === overId);
      const insertAt = overIndex >= 0 ? overIndex : dstOrder.length;
      const newDst = [...dstOrder.slice(0, insertAt), taskId, ...dstOrder.slice(insertAt)];
      return { ...prev, [sourceStatus]: newSrc, [destStatus]: newDst };
    });
  }, [tasks, columns, localStatus]);

  const handleDragEnd = useCallback(({ active, over }: DragEndEvent) => {
    setActiveTask(null);
    if (!over) {
      // Drag cancelled — rollback local status
      setLocalStatus((prev) => { const { [active.id as string]: _, ...rest } = prev; return rest; });
      setLocalOrder({});
      return;
    }

    const overId = over.id as string;
    const task = tasks.find((t) => t.id === active.id);
    if (!task) return;

    const destColumn =
      COLUMNS.find((c) => c.id === overId)?.id ??
      tasks.find((t) => t.id === overId)?.status;

    if (!destColumn) return;

    const prevStatus = task.status;
    if (prevStatus !== destColumn) {
      updateStatus.mutate(
        { id: task.id, status: destColumn as Task['status'] },
        {
          onSuccess: () => {
            // Clear local override — server is now source of truth
            setLocalStatus((prev) => { const { [task.id]: _, ...rest } = prev; return rest; });
            setLocalOrder((prev) => {
              const { [prevStatus]: _s, [destColumn]: _d, ...rest } = prev;
              return rest;
            });
          },
          onError: () => {
            // Rollback optimistic update
            setLocalStatus((prev) => { const { [task.id]: _, ...rest } = prev; return rest; });
            setLocalOrder({});
          },
        },
      );
    } else {
      // Same-column reorder — clear local status override if any
      setLocalStatus((prev) => { const { [active.id as string]: _, ...rest } = prev; return rest; });
      const colOrder = localOrder[task.status] ?? columns[task.status].map((t) => t.id);
      const oldIdx = colOrder.indexOf(active.id as string);
      const newIdx = colOrder.indexOf(overId);
      if (oldIdx !== -1 && newIdx !== -1 && oldIdx !== newIdx) {
        setLocalOrder((prev) => ({
          ...prev,
          [task.status]: arrayMove(colOrder, oldIdx, newIdx),
        }));
      }
    }
  }, [tasks, columns, localOrder, localStatus, updateStatus]);

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div
        className="flex gap-3 overflow-x-auto pb-6 min-h-[calc(100vh-320px)]"
        style={{ userSelect: activeTask ? 'none' : undefined }}
      >
        {COLUMNS.map((col) => (
          <KanbanColumn
            key={col.id}
            id={col.id}
            title={col.title}
            tasks={columns[col.id] ?? []}
            onTaskClick={onTaskClick}
            onAddTask={onAddTask}
            onQuickAdd={onQuickAdd}
          />
        ))}
      </div>

      <DragOverlay dropAnimation={{ duration: 150, easing: 'cubic-bezier(0.18, 0.67, 0.6, 1.22)' }}>
        {activeTask ? <TaskCard task={activeTask} isDragging /> : null}
      </DragOverlay>
    </DndContext>
  );
}
