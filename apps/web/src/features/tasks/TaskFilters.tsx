import { Search, X, SlidersHorizontal, UserRound, Flag, ListFilter, Tag } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { PremiumSelect, type PremiumSelectOption } from '@/components/ui/PremiumSelect';

export type TaskGroupBy = 'none' | 'status' | 'priority' | 'assignee' | 'dueDate';

interface TaskFiltersProps {
  search: string;
  onSearchChange: (v: string) => void;
  priority: string;
  onPriorityChange: (v: string) => void;
  status?: string;
  onStatusChange?: (v: string) => void;
  assigneeId: string;
  onAssigneeChange: (v: string) => void;
  members?: { id: string; firstName: string; lastName: string }[];
  labelFilter?: string;
  onLabelFilterChange?: (v: string) => void;
  groupBy?: TaskGroupBy;
  onGroupByChange?: (v: TaskGroupBy) => void;
}

export function TaskFilters({
  search,
  onSearchChange,
  priority,
  onPriorityChange,
  status = '',
  onStatusChange,
  assigneeId,
  onAssigneeChange,
  members = [],
  labelFilter = '',
  onLabelFilterChange,
  groupBy = 'none',
  onGroupByChange,
}: TaskFiltersProps) {
  const { t } = useTranslation();
  const hasFilters = search || priority || status || assigneeId || labelFilter || groupBy !== 'none';

  const priorityOptions: PremiumSelectOption<string>[] = [
    { value: '', label: t('task.allPriorities', { defaultValue: 'All priorities' }) },
    { value: 'LOW', label: t('priority.low') },
    { value: 'MEDIUM', label: t('priority.medium') },
    { value: 'HIGH', label: t('priority.high') },
    { value: 'CRITICAL', label: t('priority.critical'), badge: '!' },
  ];

  const statusOptions: PremiumSelectOption<string>[] = [
    { value: '', label: t('task.allStatus', { defaultValue: 'All status' }) },
    { value: 'TODO', label: t('status.todo', { defaultValue: 'To do' }) },
    { value: 'IN_PROGRESS', label: t('status.inProgress', { defaultValue: 'In progress' }) },
    { value: 'REVIEW', label: t('status.review', { defaultValue: 'Review' }) },
    { value: 'DONE', label: t('status.done', { defaultValue: 'Done' }) },
  ];

  const assigneeOptions: PremiumSelectOption<string>[] = [
    { value: '', label: t('task.allAssignees', { defaultValue: 'All assignees' }) },
    ...members.map((m) => ({
      value: m.id,
      label: `${m.firstName} ${m.lastName}`,
      icon: <UserRound className="h-3.5 w-3.5" />,
      description: m.id,
    })),
  ];

  const groupByOptions: PremiumSelectOption<TaskGroupBy>[] = [
    { value: 'none', label: t('project.list.groupNone', { defaultValue: 'No group' }) },
    { value: 'status', label: t('task.status', { defaultValue: 'Status' }) },
    { value: 'priority', label: t('task.priority', { defaultValue: 'Priority' }) },
    { value: 'assignee', label: t('task.assignee', { defaultValue: 'Assignee' }) },
    { value: 'dueDate', label: t('task.dueDate', { defaultValue: 'Due date' }) },
  ];

  const clear = () => {
    onSearchChange('');
    onPriorityChange('');
    onStatusChange?.('');
    onAssigneeChange('');
    onLabelFilterChange?.('');
    onGroupByChange?.('none');
  };

  return (
    <div className="premium-panel p-3">
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
          <SlidersHorizontal className="h-3.5 w-3.5" />
          {t('task.smartFilters', { defaultValue: 'Smart filters' })}
        </div>
        {hasFilters && (
          <Button onClick={clear} variant="ghost" size="sm" className="h-7 px-2.5 text-xs">
            <X className="h-3.5 w-3.5" />
            {t('common.clearAll', { defaultValue: 'Clear all' })}
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 gap-2 lg:grid-cols-12">
        <div className="lg:col-span-4">
          <Input
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={t('project.list.searchPlaceholder', { defaultValue: 'Search title, description, labels, assignee...' })}
            leftIcon={<Search className="h-4 w-4" />}
            className="h-10"
          />
        </div>

        <div className="lg:col-span-2">
          <PremiumSelect
            value={status}
            onValueChange={(v) => onStatusChange?.(v)}
            options={statusOptions}
            ariaLabel={t('project.list.filterStatus', { defaultValue: 'Filter by status' })}
            triggerClassName="h-10 rounded-xl"
          />
        </div>

        <div className="lg:col-span-2">
          <PremiumSelect
            value={priority}
            onValueChange={(v) => onPriorityChange(v)}
            options={priorityOptions}
            ariaLabel={t('task.priority', { defaultValue: 'Priority' })}
            triggerClassName="h-10 rounded-xl"
          />
        </div>

        <div className="lg:col-span-2">
          <PremiumSelect
            value={assigneeId}
            onValueChange={(v) => onAssigneeChange(v)}
            options={assigneeOptions}
            ariaLabel={t('task.assignee', { defaultValue: 'Assignee' })}
            triggerClassName="h-10 rounded-xl"
          />
        </div>

        <div className="lg:col-span-2">
          <div className="inline-flex h-10 w-full items-center gap-1 rounded-xl border border-border/50 bg-card px-2">
            <ListFilter className="h-3.5 w-3.5 text-muted-foreground" />
            <PremiumSelect
              value={groupBy}
              onValueChange={(v) => onGroupByChange?.(v as TaskGroupBy)}
              options={groupByOptions}
              size="sm"
              ariaLabel={t('project.list.groupBy', { defaultValue: 'Group by' })}
              triggerClassName="h-8 min-w-0 border-0 bg-transparent px-1 shadow-none"
              contentClassName="min-w-[200px]"
            />
          </div>
        </div>
      </div>

      {hasFilters && (
        <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs">
          {priority && (
            <span className="inline-flex items-center gap-1 rounded-full border border-border/80 bg-secondary/75 px-2 py-1 text-muted-foreground">
              <Flag className="h-3 w-3" />
              {priority}
            </span>
          )}
          {status && (
            <span className="inline-flex items-center gap-1 rounded-full border border-border/80 bg-secondary/75 px-2 py-1 text-muted-foreground">
              <Flag className="h-3 w-3" />
              {status}
            </span>
          )}
          {assigneeId && (
            <span className="inline-flex items-center gap-1 rounded-full border border-border/80 bg-secondary/75 px-2 py-1 text-muted-foreground">
              <UserRound className="h-3 w-3" />
              {t('task.assigneeSelected', { defaultValue: 'Assignee selected' })}
            </span>
          )}
          {labelFilter && (
            <span className="inline-flex items-center gap-1 rounded-full border border-border/80 bg-secondary/75 px-2 py-1 text-muted-foreground">
              <Tag className="h-3 w-3" />
              {labelFilter}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
