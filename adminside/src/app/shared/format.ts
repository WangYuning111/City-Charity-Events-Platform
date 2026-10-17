import { EventStatus } from '../core/models/admin.models';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function toDatePart(value: string | null | undefined): string {
  return value ? String(value).substring(0, 10) : '';
}

export function formatDate(value: string | null | undefined): string {
  const part = toDatePart(value);
  if (!part) return '—';
  const [year, month, day] = part.split('-').map(Number);
  if (!year || !month || !day) return part;
  return `${MONTHS[month - 1]} ${day}, ${year}`;
}

export function formatTime(value: string | null | undefined): string {
  if (!value) return '';
  const [h, m] = String(value).split(':').map(Number);
  if (Number.isNaN(h)) return String(value);
  const suffix = h >= 12 ? 'PM' : 'AM';
  return `${h % 12 || 12}:${String(m ?? 0).padStart(2, '0')} ${suffix}`;
}

export function formatDateTime(value: string | null | undefined): string {
  if (!value) return '—';
  const [datePart, timePart] = String(value).split(/[ T]/);
  const date = formatDate(datePart);
  return timePart ? `${date}, ${formatTime(timePart)}` : date;
}

export function formatMoney(amount: number | null | undefined): string {
  if (amount === null || amount === undefined) return '—';
  return '$' + Number(amount).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function statusLabel(status: EventStatus): string {
  const labels: Record<EventStatus, string> = {
    upcoming: 'Upcoming',
    active: 'Active',
    past: 'Ended',
    suspended: 'Suspended',
  };
  return labels[status] ?? status;
}
