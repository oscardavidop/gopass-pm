import { format, formatDistanceToNow, isValid, parseISO } from 'date-fns';

export function formatDate(date: string | Date | null | undefined, fmt = 'MMM d, yyyy') {
  if (!date) return '—';
  const d = typeof date === 'string' ? parseISO(date) : date;
  return isValid(d) ? format(d, fmt) : '—';
}

export function timeAgo(date: string | Date) {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return formatDistanceToNow(d, { addSuffix: true });
}

export function getInitials(firstName: string, lastName: string) {
  return `${firstName[0] ?? ''}${lastName[0] ?? ''}`.toUpperCase();
}

export function truncate(str: string, max = 60) {
  return str.length > max ? `${str.slice(0, max)}…` : str;
}
