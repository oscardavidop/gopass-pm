import { useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Dialog } from '@/components/ui/Dialog';
import { type Task } from '@/types/task.types';

const schema = z.object({
  title: z.string().min(2, 'Title must be at least 2 characters').max(200),
  description: z.string().max(2000).optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']),
  status: z.enum(['TODO', 'IN_PROGRESS', 'REVIEW', 'DONE']),
  dueDate: z.string().optional(),
  assigneeId: z.string().optional(),
  tags: z.string().optional(), // comma-separated
});

type TaskFormData = z.infer<typeof schema>;

interface TaskFormProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: any) => void;
  task?: Task | null;
  isLoading?: boolean;
  defaultStatus?: string;
  members?: { id: string; firstName: string; lastName: string }[];
}

export function TaskForm({ open, onClose, onSubmit, task, isLoading, defaultStatus, members = [] }: TaskFormProps) {
  const isEditing = !!task;

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<TaskFormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: '',
      description: '',
      priority: 'MEDIUM',
      status: (defaultStatus as any) ?? 'TODO',
      dueDate: '',
      assigneeId: '',
      tags: '',
    },
  });

  useEffect(() => {
    if (task) {
      reset({
        title: task.title,
        description: task.description ?? '',
        priority: task.priority as any,
        status: task.status as any,
        dueDate: task.dueDate ? task.dueDate.slice(0, 10) : '',
        assigneeId: task.assigneeId ?? '',
        tags: task.tags?.join(', ') ?? '',
      });
    } else {
      reset({
        title: '',
        description: '',
        priority: 'MEDIUM',
        status: (defaultStatus as any) ?? 'TODO',
        dueDate: '',
        assigneeId: '',
        tags: '',
      });
    }
  }, [task, reset, open, defaultStatus]);

  const handleFormSubmit = (data: TaskFormData) => {
    const payload: any = {
      ...data,
      tags: data.tags ? data.tags.split(',').map((t) => t.trim()).filter(Boolean) : [],
      assigneeId: data.assigneeId || undefined,
      dueDate: data.dueDate || undefined,
    };
    delete payload.tags; // rebuild below
    payload.tags = data.tags ? data.tags.split(',').map((t) => t.trim()).filter(Boolean) : [];
    onSubmit(payload);
  };

  return (
    <Dialog open={open} onClose={onClose} title={isEditing ? 'Edit Task' : 'New Task'}>
      <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
        <Input
          label="Task title"
          placeholder="What needs to be done?"
          error={errors.title?.message}
          {...register('title')}
        />

        <div>
          <label className="block text-sm font-medium mb-1.5">
            Description <span className="text-muted-foreground font-normal">(optional)</span>
          </label>
          <textarea
            className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
            rows={3}
            placeholder="Add more details…"
            {...register('description')}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Controller
            name="priority"
            control={control}
            render={({ field }) => (
              <div>
                <label className="block text-sm font-medium mb-1.5">Priority</label>
                <select
                  {...field}
                  className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="LOW">Low</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HIGH">High</option>
                  <option value="CRITICAL">Critical</option>
                </select>
              </div>
            )}
          />
          <Controller
            name="status"
            control={control}
            render={({ field }) => (
              <div>
                <label className="block text-sm font-medium mb-1.5">Status</label>
                <select
                  {...field}
                  className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="TODO">To do</option>
                  <option value="IN_PROGRESS">In progress</option>
                  <option value="REVIEW">Review</option>
                  <option value="DONE">Done</option>
                </select>
              </div>
            )}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Input label="Due date" type="date" {...register('dueDate')} />

          {members.length > 0 && (
            <Controller
              name="assigneeId"
              control={control}
              render={({ field }) => (
                <div>
                  <label className="block text-sm font-medium mb-1.5">Assignee</label>
                  <select
                    {...field}
                    className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    <option value="">Unassigned</option>
                    {members.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.firstName} {m.lastName}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            />
          )}
        </div>

        <Input
          label="Tags"
          placeholder="bug, frontend, design (comma-separated)"
          {...register('tags')}
        />

        <div className="flex gap-2 pt-2">
          <Button type="button" variant="outline" className="flex-1" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" className="flex-1" isLoading={isLoading}>
            {isEditing ? 'Save changes' : 'Create task'}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
