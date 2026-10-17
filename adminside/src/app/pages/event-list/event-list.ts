import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { CharityEvent, EventStatus } from '../../core/models/admin.models';
import { AdminEventService } from '../../core/services/admin-event.service';
import { extractApiError } from '../../core/services/api-error';
import { formatDate, statusLabel } from '../../shared/format';

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
  readonly loading = signal(true);
  readonly error = signal('');
  readonly notice = signal('');

  readonly search = signal('');
  readonly statusFilter = signal<'' | EventStatus>('');

  readonly pendingDelete = signal<CharityEvent | null>(null);
  readonly deleting = signal(false);

  readonly statusText = statusLabel;
  readonly dateText = formatDate;

  /** Client-side narrowing of the already-loaded list — instant feedback. */
  readonly filtered = computed(() => {
    const term = this.search().trim().toLowerCase();
    const status = this.statusFilter();

    return this.events().filter((event) => {
      if (status && event.status !== status) return false;
      if (!term) return true;
      return (
        event.event_name.toLowerCase().includes(term) ||
        (event.category_name ?? '').toLowerCase().includes(term) ||
        (event.location ?? '').toLowerCase().includes(term)
      );
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

  ngOnInit(): void {
    // Feedback passed back from the form after a successful save.
    const saved = this.route.snapshot.queryParamMap.get('saved');
    if (saved === 'created') this.notice.set('Event created successfully.');
    if (saved === 'updated') this.notice.set('Event updated successfully.');

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

  dismissNotice(): void {
    this.notice.set('');
    // Drop the ?saved= flag so a refresh does not repeat the message.
    this.router.navigate([], { replaceUrl: true, queryParams: {} });
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

  confirmDelete(): void {
    const target = this.pendingDelete();
    if (!target) return;

    this.deleting.set(true);

    this.adminService.remove(target.event_id).subscribe({
      next: (message) => {
        this.deleting.set(false);
        this.pendingDelete.set(null);
        this.notice.set(message);
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

  dismissError(): void {
    this.error.set('');
  }
}
