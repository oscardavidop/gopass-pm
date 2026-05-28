import { useState, useCallback, useMemo } from 'react';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
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

  const updateStatus = useUpdateTaskStatus();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  );

  const columns = useMemo(() => {
    const grouped: Record<string, Task[]> = { TODO: [], IN_PROGRESS: [], REVIEW: [], DONE: [] };
    tasks.forEach((task) => {
      if (grouped[task.status]) grouped[task.status].push(task);
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
    const sourceStatus = tasks.find((t) => t.id === active.id)?.status;
    const destStatus =
      COLUMNS.find((c) => c.id === overId)?.id ??
      tasks.find((t) => t.id === overId)?.status;

    if (!sourceStatus || !destStatus || sourceStatus === destStatus) return;

    setLocalOrder((prev) => {
      const srcOrder = prev[sourceStatus] ?? columns[sourceStatus].map((t) => t.id);
      const dstOrder = prev[destStatus] ?? columns[destStatus].map((t) => t.id);
      const newSrc = srcOrder.filter((id) => id !== (active.id as string));
      const overIndex = dstOrder.findIndex((id) => id === overId);
      const insertAt = overIndex >= 0 ? overIndex : dstOrder.length;
      const newDst = [...dstOrder.slice(0, insertAt), active.id as string, ...dstOrder.slice(insertAt)];
      return { ...prev, [sourceStatus]: newSrc, [destStatus]: newDst };
    });
  }, [tasks, columns]);

  const handleDragEnd = useCallback(({ active, over }: DragEndEvent) => {
    setActiveTask(null);
    if (!over) return;

    const overId = over.id as string;
    const task = tasks.find((t) => t.id === active.id);
    if (!task) return;

    const destColumn =
      COLUMNS.find((c) => c.id === overId)?.id ??
      tasks.find((t) => t.id === overId)?.status;

    if (!destColumn) return;

    if (task.status !== destColumn) {
      updateStatus.mutate({ id: task.id, status: destColumn as Task['status'] });
      setLocalOrder((prev) => {
        const { [task.status]: _s, [destColumn]: _d, ...rest } = prev;
        return rest;
      });
    } else {
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
  }, [tasks, columns, localOrder, updateStatus]);

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-3 overflow-x-auto pb-6 min-h-[calc(100vh-320px)]">
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
