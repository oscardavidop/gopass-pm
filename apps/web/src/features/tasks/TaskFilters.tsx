import { Search, X } from 'lucide-react';
import { Input } from '@/components/ui/Input';

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
    <div className="flex flex-col sm:flex-row gap-2">
      <div className="flex-1">
        <Input
          placeholder="Search tasks…"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          leftIcon={<Search className="h-4 w-4" />}
        />
      </div>

      <select
        value={priority}
        onChange={(e) => onPriorityChange(e.target.value)}
        className="px-3 py-2 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring w-full sm:w-36"
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
          className="px-3 py-2 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring w-full sm:w-44"
        >
          <option value="">All assignees</option>
          {members.map((m) => (
            <option key={m.id} value={m.id}>
              {m.firstName} {m.lastName}
            </option>
          ))}
        </select>
      )}

      {hasFilters && (
        <button
          onClick={clear}
          className="flex items-center gap-1.5 px-3 py-2 text-sm text-muted-foreground hover:text-foreground border border-input rounded-md hover:bg-accent transition-colors whitespace-nowrap"
        >
          <X className="h-3.5 w-3.5" />
          Clear
        </button>
      )}
    </div>
  );
}
