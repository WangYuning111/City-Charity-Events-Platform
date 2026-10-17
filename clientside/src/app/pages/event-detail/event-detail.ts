import { Component, computed, effect, inject, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { CharityEvent } from '../../core/models/event.model';
import { EventService } from '../../core/services/event.service';
import { extractApiError } from '../../core/services/api-error';
import { WeatherWidget } from '../../shared/weather-widget/weather-widget';
import {
  FALLBACK_IMAGE,
  detailedCountdown,
  formatDate,
  formatDateTime,
  formatMoney,
  formatTime,
  progressPercent,
  statusLabel,
} from '../../shared/format';

@Component({
  selector: 'app-event-detail',
  imports: [RouterLink, WeatherWidget],
  templateUrl: './event-detail.html',
  styleUrl: './event-detail.css',
})
export class EventDetail {
  /** Bound from the :id route parameter via withComponentInputBinding(). */
  readonly id = input.required<string>();

  private readonly eventService = inject(EventService);

  readonly event = signal<CharityEvent | null>(null);
  readonly loading = signal(true);
  readonly error = signal('');

  // Template helpers
  readonly fallbackImage = FALLBACK_IMAGE;
  readonly money = formatMoney;
  readonly dateText = formatDate;
  readonly timeText = formatTime;
  readonly dateTimeText = formatDateTime;
  readonly statusText = statusLabel;

  readonly countdown = computed(() => {
    const ev = this.event();
    return ev ? detailedCountdown(ev.event_date, ev.event_time, ev.status) : '';
  });

  readonly progress = computed(() => {
    const ev = this.event();
    return ev ? progressPercent(ev.current_amount, ev.goal_amount) : 0;
  });

  readonly isFree = computed(() => {
    const price = Number(this.event()?.ticket_price ?? 0);
    return !price;
  });

  /** Past and suspended events must not accept new registrations. */
  readonly canRegister = computed(() => {
    const status = this.event()?.status;
    return status === 'upcoming' || status === 'active';
  });

  readonly registerLabel = computed(() => {
    const status = this.event()?.status;
    if (status === 'past') return 'Event has ended';
    if (status === 'suspended') return 'Event suspended';
    return '✨ Register now';
  });

  constructor() {
    effect(() => {
      const raw = this.id();
      const id = Number(raw);

      if (!Number.isFinite(id) || id <= 0) {
        this.error.set('This event link is not valid.');
        this.loading.set(false);
        return;
      }

      this.load(id);
    });
  }

  private load(id: number): void {
    this.loading.set(true);
    this.error.set('');

    this.eventService.getEventById(id).subscribe({
      next: (event) => {
        this.event.set(event);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(extractApiError(err, 'Unable to load this event.'));
        this.event.set(null);
        this.loading.set(false);
      },
    });
  }

  /** Total value of tickets purchased, used in the registrations summary. */
  ticketsSold(): number {
    return this.event()?.tickets_sold ?? 0;
  }
}
