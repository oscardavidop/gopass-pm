import { useEffect, useMemo, useState, type ReactNode } from 'react';
import * as Popover from '@radix-ui/react-popover';
import { Command } from 'cmdk';
import { Check, ChevronDown, Search } from 'lucide-react';

import { cn } from '@/utils/cn';

export interface PremiumMultiSelectOption<T extends string = string> {
  value: T;
  label: string;
  description?: string;
  icon?: ReactNode;
  group?: string;
  keywords?: string[];
}

export interface PremiumMultiSelectGroup<T extends string = string> {
  label: string;
  options: PremiumMultiSelectOption<T>[];
}

interface PremiumMultiSelectProps<T extends string = string> {
  values: T[];
  onChange: (values: T[]) => void;
  options?: PremiumMultiSelectOption<T>[];
  groups?: PremiumMultiSelectGroup<T>[];
  placeholder?: string;
  searchPlaceholder?: string;
  emptyText?: string;
  disabled?: boolean;
  className?: string;
}

export function PremiumMultiSelect<T extends string = string>({
  values,
  onChange,
  options,
  groups,
  placeholder = 'Select options',
  searchPlaceholder = 'Search...',
  emptyText = 'No results',
  disabled,
  className,
}: PremiumMultiSelectProps<T>) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');

  const resolvedGroups = useMemo<PremiumMultiSelectGroup<T>[]>(() => {
    if (groups && groups.length) return groups;

    const grouped = new Map<string, PremiumMultiSelectOption<T>[]>();
    for (const option of options ?? []) {
      const key = option.group ?? '';
      grouped.set(key, [...(grouped.get(key) ?? []), option]);
    }

    return Array.from(grouped.entries()).map(([label, items]) => ({ label, options: items }));
  }, [groups, options]);

  const flatOptions = useMemo(() => resolvedGroups.flatMap((group) => group.options), [resolvedGroups]);
  const selectedLabels = useMemo(
    () => flatOptions.filter((option) => values.includes(option.value)).map((option) => option.label),
    [flatOptions, values],
  );

  const filteredGroups = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return resolvedGroups;

    return resolvedGroups
      .map((group) => ({
        ...group,
        options: group.options.filter((option) => {
          const haystack = [
            option.label,
            option.description ?? '',
            option.keywords?.join(' ') ?? '',
            option.value,
          ]
            .join(' ')
            .toLowerCase();
          return haystack.includes(term);
        }),
      }))
      .filter((group) => group.options.length > 0);
  }, [query, resolvedGroups]);

  useEffect(() => {
    if (!open) setQuery('');
  }, [open]);

  const toggleValue = (value: T) => {
    if (values.includes(value)) {
      onChange(values.filter((item) => item !== value));
      return;
    }

    onChange([...values, value]);
  };

  return (
    <div className={cn('w-full', className)}>
      <Popover.Root open={open} onOpenChange={setOpen}>
        <Popover.Trigger asChild>
          <button
            type="button"
            disabled={disabled}
            className={cn(
              'inline-flex h-10 w-full items-center justify-between gap-3 rounded-md border border-border/60 bg-background px-3 text-sm',
              'transition-colors hover:bg-muted/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20',
              'disabled:cursor-not-allowed disabled:opacity-50',
            )}
          >
            <span className="min-w-0 flex-1 text-left text-sm">
              {selectedLabels.length > 0 ? (
                <span className="block truncate">{selectedLabels.join(', ')}</span>
              ) : (
                <span className="text-muted-foreground">{placeholder}</span>
              )}
            </span>
            <ChevronDown className={cn('h-4 w-4 shrink-0 text-muted-foreground transition-transform', open && 'rotate-180')} />
          </button>
        </Popover.Trigger>

        <Popover.Portal>
          <Popover.Content
            align="start"
            sideOffset={8}
            className="z-50 w-[var(--radix-popover-trigger-width)] rounded-xl border border-border/60 bg-popover p-1.5 shadow-xl"
          >
            <Command loop shouldFilter={false} className="bg-transparent">
              <div className="flex items-center gap-2 border-b border-border/60 px-2 py-2">
                <Search className="h-3.5 w-3.5 text-muted-foreground" />
                <Command.Input
                  value={query}
                  onValueChange={setQuery}
                  placeholder={searchPlaceholder}
                  className="h-7 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                />
              </div>

              <Command.List className="max-h-72 overflow-y-auto p-1">
                <Command.Empty className="px-2 py-5 text-center text-xs text-muted-foreground">
                  {emptyText}
                </Command.Empty>

                {filteredGroups.map((group) => (
                  <Command.Group
                    key={group.label || '__ungrouped'}
                    heading={group.label || undefined}
                    className="text-xs [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:pb-1 [&_[cmdk-group-heading]]:pt-2 [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-muted-foreground"
                  >
                    {group.options.map((option) => {
                      const selected = values.includes(option.value);
                      return (
                        <Command.Item
                          key={option.value}
                          value={`${option.label} ${option.description ?? ''} ${option.keywords?.join(' ') ?? ''} ${option.value}`.trim()}
                          onSelect={() => toggleValue(option.value)}
                          className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-2.5 text-sm outline-none data-[selected=true]:bg-accent"
                        >
                          <span className={cn(
                            'flex h-4 w-4 items-center justify-center rounded border border-border/60',
                            selected ? 'bg-primary text-primary-foreground' : 'bg-background text-transparent',
                          )}>
                            <Check className="h-3 w-3" />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate">{option.label}</span>
                            {option.description ? (
                              <span className="block truncate text-[11px] text-muted-foreground">{option.description}</span>
                            ) : null}
                          </span>
                        </Command.Item>
                      );
                    })}
                  </Command.Group>
                ))}
              </Command.List>
            </Command>
          </Popover.Content>
        </Popover.Portal>
      </Popover.Root>
    </div>
  );
}
