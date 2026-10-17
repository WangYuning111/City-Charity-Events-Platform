import { Component, OnInit, computed, inject, signal } from '@angular/core';

import { CharityEvent } from '../../core/models/event.model';
import { EventService } from '../../core/services/event.service';
import { extractApiError } from '../../core/services/api-error';
import { EventCard } from '../../shared/event-card/event-card';

@Component({
  selector: 'app-home',
  imports: [EventCard],
  templateUrl: './home.html',
  styleUrl: './home.css',
})
export class Home implements OnInit {
  private readonly eventService = inject(EventService);

  readonly events = signal<CharityEvent[]>([]);
  readonly loading = signal(true);
  readonly error = signal('');

  /** Hero figures are derived from the API payload, never hard-coded. */
  readonly eventCount = computed(() => this.events().length);

  readonly organisationCount = computed(
    () => new Set(this.events().map((e) => e.org_id).filter((id) => id !== null)).size
  );

  readonly totalRaised = computed(() =>
    this.events().reduce((sum, e) => sum + Number(e.current_amount || 0), 0)
  );

  readonly raisedLabel = computed(() => {
    const total = this.totalRaised();
    if (total >= 1_000_000) return '$' + (total / 1_000_000).toFixed(1) + 'M';
    if (total >= 1_000) return '$' + Math.round(total / 1_000) + 'K';
    return '$' + total;
  });

  ngOnInit(): void {
    this.loadEvents();
  }

  loadEvents(): void {
    this.loading.set(true);
    this.error.set('');

    this.eventService.getPublicEvents().subscribe({
      next: (events) => {
        this.events.set(events);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(extractApiError(err, 'Unable to load events right now.'));
        this.loading.set(false);
      },
    });
  }
}
