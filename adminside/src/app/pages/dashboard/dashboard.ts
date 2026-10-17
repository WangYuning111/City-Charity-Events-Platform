import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';

import {
  CharityEvent,
  EventRegistration,
  EventStatus,
} from '../../core/models/admin.models';
import { AdminEventService } from '../../core/services/admin-event.service';
import { AdminRegistrationService } from '../../core/services/admin-registration.service';
import { extractApiError } from '../../core/services/api-error';
import { formatDate, formatDateTime, formatMoney, statusLabel } from '../../shared/format';

interface StatusSlice {
  status: EventStatus;
  label: string;
  count: number;
  pct: number;
}

interface BarRow {
  label: string;
  count: number;
  pct: number;
}

/**
 * Operational overview of the whole catalogue.
 *
 * Everything here is derived from the two list endpoints — no bespoke
 * statistics API — so the numbers can never disagree with the tables the
 * staff member is about to open.
 */
@Component({
  selector: 'app-dashboard',
  imports: [RouterLink],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css',
})
export class Dashboard implements OnInit {
  private readonly eventService = inject(AdminEventService);
  private readonly registrationService = inject(AdminRegistrationService);

  readonly events = signal<CharityEvent[]>([]);
  readonly registrations = signal<EventRegistration[]>([]);
  readonly loading = signal(true);
  readonly error = signal('');

  readonly money = formatMoney;
  readonly dateText = formatDate;
  readonly dateTimeText = formatDateTime;
  readonly statusText = statusLabel;

  /** Exposed for bar widths: templates cannot reach the global Math object. */
  readonly Math = Math;

  // ---------- Headline figures ----------

  readonly totalEvents = computed(() => this.events().length);

  readonly liveEvents = computed(
    () => this.events().filter((e) => e.status === 'active' || e.status === 'upcoming').length
  );

  readonly totalRegistrations = computed(() => this.registrations().length);

  readonly ticketsSold = computed(() =>
    this.registrations().reduce((sum, r) => sum + Number(r.tickets_purchased || 0), 0)
  );

  readonly raised = computed(() =>
    this.events().reduce((sum, e) => sum + Number(e.current_amount || 0), 0)
  );

  readonly goal = computed(() =>
    this.events().reduce((sum, e) => sum + Number(e.goal_amount || 0), 0)
  );

  readonly raisedPct = computed(() => {
    const goal = this.goal();
    if (goal <= 0) return 0;
    return Math.min(Math.round((this.raised() / goal) * 100), 100);
  });

  // ---------- Breakdowns ----------

  readonly statusBreakdown = computed<StatusSlice[]>(() => {
    const total = this.totalEvents() || 1;
    const order: EventStatus[] = ['active', 'upcoming', 'past', 'suspended'];

    return order.map((status) => {
      const count = this.events().filter((e) => e.status === status).length;
      return {
        status,
        label: statusLabel(status),
        count,
        pct: Math.round((count / total) * 100),
      };
    });
  });

  readonly categoryBreakdown = computed<BarRow[]>(() => {
    const counts = new Map<string, number>();

    for (const event of this.events()) {
      counts.set(event.category_name, (counts.get(event.category_name) ?? 0) + 1);
    }

    // Bars are scaled against the largest category so small counts stay visible.
    const largest = Math.max(1, ...counts.values());

    return [...counts.entries()]
      .map(([label, count]) => ({
        label,
        count,
        pct: Math.round((count / largest) * 100),
      }))
      .sort((a, b) => b.count - a.count);
  });

  /** Highest-earning events, used for the fundraising leaderboard. */
  readonly topFundraisers = computed(() =>
    [...this.events()]
      .filter((e) => Number(e.goal_amount) > 0)
      .sort((a, b) => Number(b.current_amount) - Number(a.current_amount))
      .slice(0, 4)
  );

  readonly recentRegistrations = computed(() => this.registrations().slice(0, 6));

  readonly busiestEvents = computed(() =>
    [...this.events()]
      .filter((e) => (e.registration_count ?? 0) > 0)
      .sort((a, b) => (b.registration_count ?? 0) - (a.registration_count ?? 0))
      .slice(0, 5)
  );

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set('');

    // One subscription, two parallel requests.
    forkJoin({
      events: this.eventService.getAll(),
      registrations: this.registrationService.getAll(),
    }).subscribe({
      next: ({ events, registrations }) => {
        this.events.set(events);
        this.registrations.set(registrations);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(extractApiError(err, 'Unable to load the dashboard.'));
        this.loading.set(false);
      },
    });
  }

  /** Whether this event declares a participant limit at all. */
  hasCapacity(event: CharityEvent): boolean {
    return Number(event.max_participants) > 0;
  }

  /** Percentage of capacity already taken; 0 when capacity is unlimited. */
  fillRate(event: CharityEvent): number {
    const capacity = Number(event.max_participants);
    if (!capacity) return 0;
    return Math.min(Math.round((Number(event.tickets_sold ?? 0) / capacity) * 100), 100);
  }

  eventProgress(event: CharityEvent): number {
    const goal = Number(event.goal_amount);
    if (goal <= 0) return 0;
    return Math.min(Math.round((Number(event.current_amount) / goal) * 100), 100);
  }
}
