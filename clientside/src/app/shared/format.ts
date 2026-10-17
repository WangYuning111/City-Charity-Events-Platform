import { EventStatus } from '../core/models/event.model';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/**
 * Reduce any date representation to its plain YYYY-MM-DD calendar part.
 *
 * MySQL DATE columns are returned as strings thanks to `dateStrings: true`
 * on the connection pool. We still slice the first 10 characters so that a
 * full ISO timestamp (which carries a UTC instant that can sit one day behind
 * the local date) can never shift the rendered day.
 */
export function toDatePart(value: string | null | undefined): string {
  return value ? String(value).substring(0, 10) : '';
}

export function formatDate(value: string | null | undefined): string {
  const part = toDatePart(value);
  if (!part) return '';
  const [year, month, day] = part.split('-').map(Number);
  if (!year || !month || !day) return part;
  return `${MONTHS[month - 1]} ${day}, ${year}`;
}

export function formatShortDate(value: string | null | undefined): string {
  const part = toDatePart(value);
  if (!part) return '';
  const [, month, day] = part.split('-').map(Number);
  return `${MONTHS[month - 1]} ${day}`;
}

export function formatTime(value: string | null | undefined): string {
  if (!value) return '';
  const [h, m] = String(value).split(':').map(Number);
  if (Number.isNaN(h)) return value;
  const suffix = h >= 12 ? 'PM' : 'AM';
  const hour = h % 12 || 12;
  return `${hour}:${String(m ?? 0).padStart(2, '0')} ${suffix}`;
}

export function formatMoney(amount: number | null | undefined): string {
  if (amount === null || amount === undefined) return '—';
  const n = Number(amount);
  if (!n) return 'Free';
  return '$' + n.toLocaleString('en-US', { maximumFractionDigits: 2 });
}

export function formatCurrencyExact(amount: number | null | undefined): string {
  if (amount === null || amount === undefined) return '—';
  return '$' + Number(amount).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

/** Days remaining, expressed the way a visitor would say it. */
export function countdownText(
  date: string | null | undefined,
  status: EventStatus
): string {
  if (!date || status === 'past' || status === 'suspended') return '';

  const target = new Date(toDatePart(date) + 'T00:00:00');
  if (Number.isNaN(target.getTime())) return '';

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const days = Math.ceil((target.getTime() - today.getTime()) / 86_400_000);

  if (days < 0) return '';
  if (days === 0) return 'Today!';
  if (days === 1) return 'Tomorrow';
  if (days <= 7) return `${days} days left`;
  if (days <= 30) return `${Math.ceil(days / 7)} weeks left`;
  return `${Math.ceil(days / 30)} month(s) left`;
}

/** Detailed countdown used on the detail page (days + hours or hours + mins). */
export function detailedCountdown(
  date: string | null | undefined,
  time: string | null | undefined,
  status: EventStatus
): string {
  if (!date || !time || status === 'past' || status === 'suspended') return '';

  const target = new Date(`${toDatePart(date)}T${time}`);
  if (Number.isNaN(target.getTime())) return '';

  const diff = target.getTime() - Date.now();
  if (diff <= 0) return '';

  const days = Math.floor(diff / 86_400_000);
  const hours = Math.floor((diff % 86_400_000) / 3_600_000);
  const minutes = Math.floor((diff % 3_600_000) / 60_000);

  if (days > 0) return `${days} day${days === 1 ? '' : 's'} ${hours} hr${hours === 1 ? '' : 's'} remaining`;
  if (hours > 0) return `${hours} hr${hours === 1 ? '' : 's'} ${minutes} min${minutes === 1 ? '' : 's'} remaining`;
  return `${minutes} min${minutes === 1 ? '' : 's'} remaining`;
}

/** Format a DATETIME such as "2026-09-18 09:05:00" as "Sep 18, 2026, 9:05 AM". */
export function formatDateTime(value: string | null | undefined): string {
  if (!value) return '—';
  const [datePart, timePart] = String(value).split(/[ T]/);
  const date = formatDate(datePart);
  return timePart ? `${date}, ${formatTime(timePart)}` : date;
}

export function statusLabel(status: EventStatus): string {
  const labels: Record<EventStatus, string> = {
    upcoming: 'Upcoming',
    active: 'Active',
    past: 'Ended',
    suspended: 'Suspended'
  };
  return labels[status] ?? status;
}

export function progressPercent(current: number, goal: number): number {
  if (!goal || goal <= 0) return 0;
  return Math.min(Math.round((Number(current) / Number(goal)) * 100), 100);
}

export function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Placeholder used when an event image is missing or fails to load. */
export const FALLBACK_IMAGE =
  'data:image/svg+xml;charset=UTF-8,' +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="400">
       <rect fill="#F5E6DC" width="640" height="400"/>
       <text fill="#8D6E63" x="320" y="200" text-anchor="middle"
             dominant-baseline="middle" font-family="Segoe UI, sans-serif"
             font-size="22">Charity Event</text>
     </svg>`
  );
