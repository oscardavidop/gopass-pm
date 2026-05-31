import { useEffect, useMemo, useState, type ReactNode } from 'react';
import * as Popover from '@radix-ui/react-popover';
import { Command } from 'cmdk';
import { Check, ChevronDown, Search } from 'lucide-react';

import { cn } from '@/utils/cn';

export interface PremiumSelectOption<T extends string = string> {
  value: T;
  label: string;
  description?: string;
  icon?: ReactNode;
  badge?: ReactNode;
  disabled?: boolean;
  group?: string;
  keywords?: string[];
}

export interface PremiumSelectGroup<T extends string = string> {
  label: string;
  options: PremiumSelectOption<T>[];
}

interface PremiumSelectProps<T extends string = string> {
  value?: T | null;
  onValueChange: (value: T) => void;
  options?: PremiumSelectOption<T>[];
  groups?: PremiumSelectGroup<T>[];
  placeholder?: string;
  ariaLabel?: string;
  searchPlaceholder?: string;
  emptyText?: string;
  disabled?: boolean;
  className?: string;
  triggerClassName?: string;
  contentClassName?: string;
  size?: 'sm' | 'md';
  searchable?: boolean;
  searchThreshold?: number;
  align?: 'start' | 'center' | 'end';
}

export function PremiumSelect<T extends string = string>({
  value,
  onValueChange,
  options,
  groups,
  placeholder = 'Select an option',
  ariaLabel,
  searchPlaceholder = 'Search...',
  emptyText = 'No results',
  disabled,
  className,
  triggerClassName,
  contentClassName,
  size = 'md',
  searchable,
  searchThreshold = 8,
  align = 'start',
}: PremiumSelectProps<T>) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');

  const resolvedGroups = useMemo<PremiumSelectGroup<T>[]>(() => {
    if (groups && groups.length) return groups;

    const all = options ?? [];
    const grouped = all.reduce<Map<string, PremiumSelectOption<T>[]>>((acc, option) => {
      const groupKey = option.group ?? '';
      const bucket = acc.get(groupKey) ?? [];
      bucket.push(option);
      acc.set(groupKey, bucket);
      return acc;
    }, new Map());

    return Array.from(grouped.entries()).map(([label, groupOptions]) => ({
      label,
      options: groupOptions,
    }));
  }, [groups, options]);

  const flatOptions = useMemo(
    () => resolvedGroups.flatMap((group) => group.options),
    [resolvedGroups],
  );

  const selected = useMemo(
    () => flatOptions.find((option) => option.value === value),
    [flatOptions, value],
  );

  const shouldSearch = searchable ?? flatOptions.length > searchThreshold;

  const filteredGroups = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return resolvedGroups;

    return resolvedGroups
      .map((group) => ({
        ...group,
        options: group.options.filter((option) => {
          const searchableText = [
            option.label,
            option.description ?? '',
            option.keywords?.join(' ') ?? '',
            String(option.value),
          ]
            .join(' ')
            .toLowerCase();

          return searchableText.includes(term);
        }),
      }))
      .filter((group) => group.options.length > 0);
  }, [resolvedGroups, query]);

  useEffect(() => {
    if (!open) setQuery('');
  }, [open]);

  const triggerBase = size === 'sm'
    ? 'h-8 px-2.5 text-xs rounded-md'
    : 'h-10 px-3 text-sm rounded-md';

  return (
    <div className={cn('w-full', className)}>
      <Popover.Root open={open} onOpenChange={setOpen}>
        <Popover.Trigger asChild>
          <button
            type="button"
            aria-label={ariaLabel}
            aria-haspopup="listbox"
            aria-expanded={open}
            disabled={disabled}
            className={cn(
              'group inline-flex w-full items-center justify-between gap-2',
              'border border-border/50 bg-card backdrop-blur',
              'text-foreground shadow-sm transition-all duration-200',
              'hover:bg-accent/60 hover:shadow-lg',
              'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/20',
              'disabled:cursor-not-allowed disabled:opacity-50',
              triggerBase,
              triggerClassName,
            )}
          >
            <span className="min-w-0 flex-1 text-left">
              {selected ? (
                <span className="flex items-center gap-2">
                  {selected.icon ? <span className="shrink-0 text-muted-foreground">{selected.icon}</span> : null}
                  <span className="truncate">{selected.label}</span>
                  {selected.badge ? (
                    <span className="rounded-full border border-border/60 bg-secondary px-1.5 py-0.5 text-[10px] text-muted-foreground">
                      {selected.badge}
                    </span>
                  ) : null}
                </span>
              ) : (
                <span className="text-muted-foreground">{placeholder}</span>
              )}
            </span>

            <ChevronDown
              className={cn(
                'h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200',
                open && 'rotate-180 text-foreground',
              )}
            />
          </button>
        </Popover.Trigger>

        <Popover.Portal>
          <Popover.Content
            align={align}
            sideOffset={8}
            className={cn(
              'z-50 w-[var(--radix-popover-trigger-width)] min-w-[220px] max-w-[95vw]',
              'rounded-md border border-border/50 bg-popover/95 text-popover-foreground backdrop-blur-xl',
              'shadow-xl shadow-black/10',
              'data-[state=open]:animate-in data-[state=closed]:animate-out',
              'data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0',
              'data-[state=open]:zoom-in-95 data-[state=closed]:zoom-out-95',
              'data-[state=open]:slide-in-from-top-1 data-[side=bottom]:data-[state=open]:slide-in-from-top-2',
              contentClassName,
            )}
          >
            <Command loop shouldFilter={false} className="rounded-2xl bg-transparent">
              {shouldSearch ? (
                <div className="flex items-center gap-2 border-b border-border/60 px-3 py-2.5">
                  <Search className="h-3.5 w-3.5 text-muted-foreground" />
                  <Command.Input
                    value={query}
                    onValueChange={setQuery}
                    placeholder={searchPlaceholder}
                    className="h-7 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                  />
                </div>
              ) : null}

              <Command.List className="max-h-72 overflow-y-auto p-1.5">
                <Command.Empty className="px-2 py-5 text-center text-xs text-muted-foreground">
                  {emptyText}
                </Command.Empty>

                {filteredGroups.map((group) => (
                  <Command.Group
                    key={group.label || '__ungrouped'}
                    heading={group.label || undefined}
                    className="text-xs [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:pb-1 [&_[cmdk-group-heading]]:pt-1.5 [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-muted-foreground"
                  >
                    {group.options.map((option) => {
                      const isSelected = option.value === value;

                      return (
                        <Command.Item
                          key={option.value}
                          value={`${option.label} ${option.description ?? ''} ${option.keywords?.join(' ') ?? ''} ${option.value}`.trim()}
                          disabled={option.disabled}
                          onSelect={() => {
                            if (option.disabled) return;
                            onValueChange(option.value);
                            setOpen(false);
                          }}
                          className={cn(
                            'flex cursor-pointer items-center gap-2 rounded-md px-2 py-2.5 text-sm outline-none',
                            'transition-all duration-200',
                            'data-[selected=true]:bg-accent data-[selected=true]:text-accent-foreground',
                            'data-[disabled=true]:pointer-events-none data-[disabled=true]:opacity-50',
                          )}
                          aria-selected={isSelected}
                        >
                          <span className="shrink-0 text-muted-foreground">
                            {isSelected ? <Check className="h-3.5 w-3.5 text-primary" /> : option.icon ?? <span className="block h-3.5 w-3.5" />}
                          </span>

                          <span className="min-w-0 flex-1">
                            <span className="flex items-center gap-1.5">
                              <span className="truncate">{option.label}</span>
                              {option.badge ? (
                                <span className="rounded-full border border-border/60 bg-secondary px-1.5 py-0.5 text-[10px] text-muted-foreground">
                                  {option.badge}
                                </span>
                              ) : null}
                            </span>
                            {option.description ? (
                              <span className="block truncate text-[11px] text-muted-foreground">
                                {option.description}
                              </span>
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
