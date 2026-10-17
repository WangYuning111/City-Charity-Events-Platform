import { Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';

import { CharityEvent } from '../../core/models/event.model';
import {
  FALLBACK_IMAGE,
  countdownText,
  escapeRegExp,
  formatMoney,
  formatDate,
  formatTime,
  progressPercent,
  statusLabel,
} from '../format';

interface TextPart {
  text: string;
  match: boolean;
}

/**
 * Presentation-only card. It receives one event through a signal input and
 * derives every displayed value from it, so it can be reused unchanged on the
 * home page and on the search results page.
 */
@Component({
  selector: 'app-event-card',
  imports: [RouterLink],
  templateUrl: './event-card.html',
  styleUrl: './event-card.css',
})
export class EventCard {
  readonly event = input.required<CharityEvent>();

  /** Optional search term; matching text in the location is highlighted. */
  readonly highlight = input<string>('');

  readonly fallbackImage = FALLBACK_IMAGE;

  /** Exposed so the template can format the fundraising total. */
  readonly money = formatMoney;

  readonly isFree = computed(() => {
    const price = Number(this.event().ticket_price);
    return !price || price === 0;
  });

  readonly progress = computed(() =>
    progressPercent(this.event().current_amount, this.event().goal_amount)
  );

  readonly dateText = computed(() => formatDate(this.event().event_date));
  readonly timeText = computed(() => formatTime(this.event().event_time));
  readonly countdown = computed(() =>
    countdownText(this.event().event_date, this.event().status)
  );

  readonly statusText = computed(() => statusLabel(this.event().status));
  readonly priceText = computed(() => formatMoney(this.event().ticket_price));

  /**
   * Split the location into plain and matching segments so the template can
   * wrap only the matched part in <mark>. Doing this with data (rather than
   * an innerHTML string) keeps the rendering XSS-safe.
   */
  readonly locationParts = computed<TextPart[]>(() => {
    const location = this.event().location ?? '';
    const query = this.highlight().trim();

    if (!query) return [{ text: location, match: false }];

    const pattern = new RegExp(`(${escapeRegExp(query)})`, 'gi');
    const segments = location.split(pattern).filter((s) => s !== '');

    return segments.map((text) => ({
      text,
      match: text.toLowerCase() === query.toLowerCase(),
    }));
  });

  onImageError(event: Event): void {
    const img = event.target as HTMLImageElement;
    if (img.src !== this.fallbackImage) img.src = this.fallbackImage;
  }
}
