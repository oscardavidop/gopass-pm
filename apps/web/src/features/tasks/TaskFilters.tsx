import { Search, X, SlidersHorizontal, UserRound, Flag } from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';

interface TaskFiltersProps {
  search: string;
  onSearchChange: (v: string) => void;
  priority: string;
  onPriorityChange: (v: string) => void;
  assigneeId: string;
  onAssigneeChange: (v: string) => void;
  members?: { id: string; firstName: string; lastName: string }[];
}

export function TaskFilters({
  search,
  onSearchChange,
  priority,
  onPriorityChange,
  assigneeId,
  onAssigneeChange,
  members = [],
}: TaskFiltersProps) {
  const hasFilters = search || priority || assigneeId;

  const clear = () => {
    onSearchChange('');
    onPriorityChange('');
    onAssigneeChange('');
  };

  return (
    <div className="premium-panel p-2.5 md:p-3">
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
          <SlidersHorizontal className="h-3.5 w-3.5" />
          Smart filters
        </div>
        {hasFilters && (
          <Button
            onClick={clear}
            variant="ghost"
            size="sm"
            className="h-7 px-2.5 text-xs"
          >
            <X className="h-3.5 w-3.5" />
            Clear all
          </Button>
        )}
      </div>

      <div className="flex flex-col gap-2 lg:flex-row">
        <div className="flex-1">
          <Input
            placeholder="Search by title, label or context..."
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            leftIcon={<Search className="h-4 w-4" />}
            className="h-10 rounded-xl border-border/70 bg-background/70"
          />
        </div>

        <select
          value={priority}
          onChange={(e) => onPriorityChange(e.target.value)}
          className="h-10 w-full rounded-xl border border-input/80 bg-background/70 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring lg:w-44"
        >
          <option value="">All priorities</option>
          <option value="LOW">Low</option>
          <option value="MEDIUM">Medium</option>
          <option value="HIGH">High</option>
          <option value="CRITICAL">Critical</option>
        </select>

        {members.length > 0 && (
          <select
            value={assigneeId}
            onChange={(e) => onAssigneeChange(e.target.value)}
            className="h-10 w-full rounded-xl border border-input/80 bg-background/70 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring lg:w-52"
          >
            <option value="">All assignees</option>
            {members.map((m) => (
              <option key={m.id} value={m.id}>
                {m.firstName} {m.lastName}
              </option>
            ))}
          </select>
        )}
      </div>

      {hasFilters && (
        <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs">
          {priority && (
            <span className="inline-flex items-center gap-1 rounded-full border border-border/70 bg-secondary/60 px-2 py-1 text-muted-foreground">
              <Flag className="h-3 w-3" />
              {priority}
            </span>
          )}
          {assigneeId && (
            <span className="inline-flex items-center gap-1 rounded-full border border-border/70 bg-secondary/60 px-2 py-1 text-muted-foreground">
              <UserRound className="h-3 w-3" />
              Assignee selected
            </span>
          )}
        </div>
      )}
    </div>
  );
}
