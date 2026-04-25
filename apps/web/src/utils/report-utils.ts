import { format, startOfMonth, startOfYear, subDays, subMonths } from 'date-fns';

export type RevenueStreamKey = 'rooms' | 'fnb' | 'events';

const moneyFormatter = new Intl.NumberFormat('en-NG', {
  maximumFractionDigits: 0,
});

const compactMoneyFormatter = new Intl.NumberFormat('en-NG', {
  notation: 'compact',
  maximumFractionDigits: 1,
});

function toDateInput(date: Date) {
  return format(date, 'yyyy-MM-dd');
}

export function resolveReportRange(option: string) {
  const today = new Date();

  if (option === 'Last 7 Days') {
    return { from: toDateInput(subDays(today, 6)), to: toDateInput(today) };
  }

  if (option === 'Last 30 Days') {
    return { from: toDateInput(subDays(today, 29)), to: toDateInput(today) };
  }

  if (option === 'This Year') {
    return { from: toDateInput(startOfYear(today)), to: toDateInput(today) };
  }

  return { from: toDateInput(startOfMonth(subMonths(today, 5))), to: toDateInput(today) };
}

export function formatMoney(value: number) {
  return `₦${moneyFormatter.format(Math.round(value))}`;
}

export function formatCompactMoney(value: number) {
  return `₦${compactMoneyFormatter.format(value).replace('.0', '')}`;
}

export function pct(part: number, total: number) {
  if (!total) return '0% of total';
  return `${Math.round((part / total) * 100)}% of total`;
}

export function percent(value: number, total: number) {
  if (!total) return 0;
  return Math.round((value / total) * 100);
}

export function reportLabel(date: string) {
  return format(new Date(`${date}T00:00:00`), 'MMM d');
}

export function revenueTypeKey(type: string): RevenueStreamKey {
  if (type === 'POS') return 'fnb';
  if (type === 'FACILITY') return 'events';
  return 'rooms';
}

export const C = {
  blue: '#3b82f6',
  violet: '#8b5cf6',
  emerald: '#10b981',
  amber: '#f59e0b',
  red: '#ef4444',
  sky: '#0ea5e9',
  slate: '#64748b',
} as const;
