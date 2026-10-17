import { Component, DestroyRef, computed, effect, inject, input, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { WeatherForecast } from '../../core/models/weather.model';
import { WeatherService } from '../../core/services/weather.service';
import { extractApiError } from '../../core/services/api-error';
import { formatShortDate } from '../format';

/**
 * Shows the Open-Meteo forecast for an event's coordinates.
 *
 * The component is purely input-driven: give it a latitude/longitude and it
 * fetches through our own API. If an event has no coordinates it renders a
 * neutral notice instead of an empty box.
 */
@Component({
  selector: 'app-weather-widget',
  templateUrl: './weather-widget.html',
  styleUrl: './weather-widget.css',
})
export class WeatherWidget {
  readonly latitude = input<number | null>(null);
  readonly longitude = input<number | null>(null);
  readonly timezone = input<string>('Asia/Shanghai');

  private readonly weatherService = inject(WeatherService);
  private readonly destroyRef = inject(DestroyRef);

  readonly forecast = signal<WeatherForecast | null>(null);
  readonly loading = signal(false);
  readonly error = signal('');
  readonly unavailable = computed(() => this.latitude() === null || this.longitude() === null);

  readonly today = computed(() => this.forecast()?.days?.[0] ?? null);
  readonly upcomingDays = computed(() => this.forecast()?.days?.slice(1, 4) ?? []);
  readonly shortDate = formatShortDate;

  constructor() {
    effect(() => {
      const lat = this.latitude();
      const lon = this.longitude();
      const tz = this.timezone();

      if (lat === null || lon === null) {
        this.forecast.set(null);
        this.error.set('');
        this.loading.set(false);
        return;
      }

      this.load(lat, lon, tz);
    });
  }

  private load(lat: number, lon: number, timezone: string): void {
    this.loading.set(true);
    this.error.set('');

    this.weatherService
      .getForecast(lat, lon, timezone)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (forecast) => {
          this.forecast.set(forecast);
          this.loading.set(false);
        },
        error: (err) => {
          this.forecast.set(null);
          this.error.set(extractApiError(err, 'Weather is unavailable right now.'));
          this.loading.set(false);
        },
      });
  }
}
