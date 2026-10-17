import {
  Component,
  ElementRef,
  HostListener,
  OnInit,
  computed,
  effect,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import {
  CharityEvent,
  EventCategory,
  EventStatus,
} from '../../core/models/admin.models';
import { AdminEventService } from '../../core/services/admin-event.service';
import { extractApiError } from '../../core/services/api-error';
import { PUBLIC_SITE_URL } from '../../core/config/api.config';
import { formatDate, formatMoney, statusLabel } from '../../shared/format';
import { CsvColumn, downloadCsv, toCsv, todayStamp } from '../../shared/csv';

type SortKey =
  | 'event_id'
  | 'event_name'
  | 'event_date'
  | 'status'
  | 'registration_count'
  | 'tickets_sold'
  | 'current_amount';

@Component({
  selector: 'app-event-list',
  imports: [RouterLink],
  templateUrl: './event-list.html',
  styleUrl: './event-list.css',
})
export class EventList implements OnInit {
  private readonly adminService = inject(AdminEventService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  readonly events = signal<CharityEvent[]>([]);
  readonly categories = signal<EventCategory[]>([]);
  readonly loading = signal(true);
  readonly error = signal('');
  readonly notice = signal('');

  readonly search = signal('');
  readonly statusFilter = signal<'' | EventStatus>('');
  readonly categoryFilter = signal<string>('');

  readonly sortKey = signal<SortKey>('event_date');
  readonly sortDir = signal<'asc' | 'desc'>('desc');

  readonly pendingDelete = signal<CharityEvent | null>(null);
  readonly deleting = signal(false);
  readonly statusBusy = signal<number | null>(null);

  readonly statusText = statusLabel;
  readonly dateText = formatDate;
  readonly money = formatMoney;
  readonly publicSiteUrl = PUBLIC_SITE_URL;

  private readonly confirmButton =
    viewChild<ElementRef<HTMLButtonElement>>('confirmDeleteButton');

  private noticeTimer?: ReturnType<typeof setTimeout>;

  /** Column set for the CSV export — one definition, used by the button only. */
  private static readonly CSV_COLUMNS: CsvColumn<CharityEvent>[] = [
    { header: 'ID', value: (e) => e.event_id },
    { header: 'Event name', value: (e) => e.event_name },
    { header: 'Category', value: (e) => e.category_name },
    { header: 'Organisation', value: (e) => e.org_name ?? '' },
    { header: 'Date', value: (e) => String(e.event_date).substring(0, 10) },
    { header: 'Time', value: (e) => e.event_time },
    { header: 'Venue', value: (e) => e.location },
    { header: 'Address', value: (e) => e.address ?? '' },
    { header: 'Status', value: (e) => e.status },
    { header: 'Ticket price', value: (e) => Number(e.ticket_price).toFixed(2) },
    { header: 'Fundraising goal', value: (e) => Number(e.goal_amount).toFixed(2) },
    { header: 'Amount raised', value: (e) => Number(e.current_amount).toFixed(2) },
    { header: 'Registrations', value: (e) => e.registration_count ?? 0 },
    { header: 'Tickets sold', value: (e) => e.tickets_sold ?? 0 },
    { header: 'Max participants', value: (e) => e.max_participants ?? '' },
  ];

  /** Ranking used so the status column sorts by lifecycle, not alphabetically. */
  private static readonly STATUS_RANK: Record<EventStatus, number> = {
    active: 0,
    upcoming: 1,
    past: 2,
    suspended: 3,
  };

  readonly hasActiveFilters = computed(
    () => !!this.search().trim() || !!this.statusFilter() || !!this.categoryFilter()
  );

  /**
   * Everything the table shows: the loaded rows, narrowed by three independent
   * filters, then ordered by the selected column. All of it is derived state,
   * so the table re-renders whenever any one signal changes.
   */
  readonly visibleEvents = computed(() => {
    const term = this.search().trim().toLowerCase();
    const status = this.statusFilter();
    const category = this.categoryFilter();
    const key = this.sortKey();
    const direction = this.sortDir() === 'asc' ? 1 : -1;

    const rows = this.events().filter((event) => {
      if (status && event.status !== status) return false;
      if (category && String(event.category_id) !== category) return false;
      if (!term) return true;
      return (
        event.event_name.toLowerCase().includes(term) ||
        (event.category_name ?? '').toLowerCase().includes(term) ||
        (event.location ?? '').toLowerCase().includes(term)
      );
    });

    return [...rows].sort((a, b) => {
      switch (key) {
        case 'event_name':
          return a.event_name.localeCompare(b.event_name) * direction;
        case 'status':
          return (
            (EventList.STATUS_RANK[a.status] - EventList.STATUS_RANK[b.status]) * direction
          );
        case 'event_date': {
          // Compare the calendar date plus time so same-day events stay stable.
          const left = `${a.event_date} ${a.event_time}`;
          const right = `${b.event_date} ${b.event_time}`;
          return left.localeCompare(right) * direction;
        }
        case 'registration_count':
          return (
            ((a.registration_count ?? 0) - (b.registration_count ?? 0)) * direction
          );
        case 'tickets_sold':
          return ((a.tickets_sold ?? 0) - (b.tickets_sold ?? 0)) * direction;
        case 'current_amount':
          return (Number(a.current_amount) - Number(b.current_amount)) * direction;
        case 'event_id':
        default:
          return (a.event_id - b.event_id) * direction;
      }
    });
  });

  readonly stats = computed(() => {
    const all = this.events();
    return {
      total: all.length,
      live: all.filter((e) => e.status === 'upcoming' || e.status === 'active').length,
      suspended: all.filter((e) => e.status === 'suspended').length,
      registrations: all.reduce((sum, e) => sum + Number(e.registration_count || 0), 0),
    };
  });

  constructor() {
    // Move focus into the confirmation dialog as soon as it opens, and read
    // the newly rendered button on the next tick.
    effect(() => {
      if (!this.pendingDelete()) return;
      setTimeout(() => this.confirmButton()?.nativeElement.focus(), 0);
    });
  }

  ngOnInit(): void {
    const saved = this.route.snapshot.queryParamMap.get('saved');
    if (saved === 'created') this.setNotice('Event created successfully.');
    if (saved === 'updated') this.setNotice('Event updated successfully.');

    this.loadCategories();
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set('');

    this.adminService.getAll().subscribe({
      next: (events) => {
        this.events.set(events);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(extractApiError(err, 'Unable to load events.'));
        this.loading.set(false);
      },
    });
  }

  private loadCategories(): void {
    // A failure here only costs the category filter, so it must not block the list.
    this.adminService.getCategories().subscribe({
      next: (categories) => this.categories.set(categories),
      error: () => this.categories.set([]),
    });
  }

  // ---------- Sorting & filtering ----------

  sortBy(key: SortKey): void {
    if (this.sortKey() === key) {
      this.sortDir.set(this.sortDir() === 'asc' ? 'desc' : 'asc');
      return;
    }

    this.sortKey.set(key);
    // Text sorts naturally ascending; numbers and dates read best newest-first.
    this.sortDir.set(key === 'event_name' ? 'asc' : 'desc');
  }

  /** Arrow shown next to the active column header. */
  sortIndicator(key: SortKey): string {
    if (this.sortKey() !== key) return '↕';
    return this.sortDir() === 'asc' ? '↑' : '↓';
  }

  ariaSort(key: SortKey): 'ascending' | 'descending' | 'none' {
    if (this.sortKey() !== key) return 'none';
    return this.sortDir() === 'asc' ? 'ascending' : 'descending';
  }

  clearFilters(): void {
    this.search.set('');
    this.statusFilter.set('');
    this.categoryFilter.set('');
  }

  /**
   * Export exactly what is on screen. Staff usually filter first, so exporting
   * the filtered and sorted view is more useful than exporting the raw table.
   */
  exportCsv(): void {
    const rows = this.visibleEvents();
    if (rows.length === 0) return;

    const csv = toCsv(rows, EventList.CSV_COLUMNS);
    downloadCsv(`charity-events-${todayStamp()}.csv`, csv);
    this.setNotice(`Exported ${rows.length} event(s) to CSV.`);
  }

  // ---------- Inline status change ----------

  /** A past event has already ended; suspending it would mean nothing. */
  canToggleStatus(event: CharityEvent): boolean {
    return event.status !== 'past';
  }

  statusActionLabel(event: CharityEvent): string {
    return event.status === 'suspended' ? 'Reinstate' : 'Suspend';
  }

  /**
   * Suspend or reinstate straight from the row.
   *
   * This is a partial update — only `status` is sent, and the API merges it
   * into the existing record. Suspending removes the event from every public
   * listing immediately, because visibility is a data-level rule.
   */
  toggleStatus(event: CharityEvent): void {
    const next: EventStatus = event.status === 'suspended' ? 'upcoming' : 'suspended';

    this.statusBusy.set(event.event_id);
    this.error.set('');

    this.adminService.update(event.event_id, { status: next }).subscribe({
      next: () => {
        this.statusBusy.set(null);
        this.setNotice(
          next === 'suspended'
            ? `"${event.event_name}" suspended — it is now hidden from the public site.`
            : `"${event.event_name}" reinstated as an upcoming event.`
        );
        this.load();
      },
      error: (err) => {
        this.statusBusy.set(null);
        this.error.set(extractApiError(err, 'Unable to change the event status.'));
      },
    });
  }

  // ---------- Feedback ----------

  private setNotice(message: string): void {
    this.notice.set(message);
    if (this.noticeTimer) clearTimeout(this.noticeTimer);
    // Operational confirmations should not linger and push the table down.
    this.noticeTimer = setTimeout(() => this.notice.set(''), 6000);
  }

  dismissNotice(): void {
    if (this.noticeTimer) clearTimeout(this.noticeTimer);
    this.notice.set('');
    // Drop the ?saved= flag so a refresh does not repeat the message.
    this.router.navigate([], { replaceUrl: true, queryParams: {} });
  }

  dismissError(): void {
    this.error.set('');
  }

  // ---------- Delete flow ----------

  askDelete(event: CharityEvent): void {
    this.error.set('');
    this.notice.set('');
    this.pendingDelete.set(event);
  }

  cancelDelete(): void {
    this.pendingDelete.set(null);
  }

  /** Escape always cancels — the destructive action needs a deliberate click. */
  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.pendingDelete() && !this.deleting()) this.cancelDelete();
  }

  confirmDelete(): void {
    const target = this.pendingDelete();
    if (!target) return;

    this.deleting.set(true);

    this.adminService.remove(target.event_id).subscribe({
      next: (message) => {
        this.deleting.set(false);
        this.pendingDelete.set(null);
        this.setNotice(message);
        this.load();
      },
      error: (err) => {
        this.deleting.set(false);
        this.pendingDelete.set(null);
        // HTTP 409 carries the business rule explanation (registrations exist).
        this.error.set(extractApiError(err, 'Unable to delete this event.'));
      },
    });
  }
}
