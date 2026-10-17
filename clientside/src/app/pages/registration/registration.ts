import { Component, computed, effect, inject, input, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';

import { CharityEvent, EventRegistration } from '../../core/models/event.model';
import { EventService } from '../../core/services/event.service';
import { RegistrationService } from '../../core/services/registration.service';
import { extractApiError } from '../../core/services/api-error';
import { WeatherWidget } from '../../shared/weather-widget/weather-widget';
import {
  FALLBACK_IMAGE,
  formatDate,
  formatDateTime,
  formatMoney,
  formatTime,
  statusLabel,
} from '../../shared/format';

@Component({
  selector: 'app-registration',
  imports: [ReactiveFormsModule, RouterLink, WeatherWidget],
  templateUrl: './registration.html',
  styleUrl: './registration.css',
})
export class Registration {
  /** Bound from the :id route parameter. */
  readonly id = input.required<string>();

  private readonly eventService = inject(EventService);
  private readonly registrationService = inject(RegistrationService);
  private readonly fb = inject(FormBuilder);

  readonly event = signal<CharityEvent | null>(null);
  readonly loading = signal(true);
  readonly loadError = signal('');

  readonly submitting = signal(false);
  readonly submitError = signal('');
  readonly confirmation = signal<EventRegistration | null>(null);

  readonly fallbackImage = FALLBACK_IMAGE;
  readonly money = formatMoney;
  readonly dateText = formatDate;
  readonly timeText = formatTime;
  readonly dateTimeText = formatDateTime;
  readonly statusText = statusLabel;

  /**
   * Reactive form with the same rules the API enforces. Validating on the
   * client gives instant feedback; validating on the server remains the
   * authority, because client-side checks can always be bypassed.
   */
  readonly form = this.fb.nonNullable.group({
    attendee_name: [
      '',
      [
        Validators.required,
        Validators.minLength(2),
        Validators.maxLength(150),
      ],
    ],
    attendee_email: ['', [Validators.required, Validators.email]],
    attendee_phone: [
      '',
      [Validators.pattern(/^[+()\d][\d\s()+-]{5,29}$/)],
    ],
    tickets_purchased: [
      1,
      [
        Validators.required,
        Validators.min(1),
        Validators.max(10),
        Validators.pattern(/^\d+$/),
      ],
    ],
    special_requests: ['', [Validators.maxLength(255)]],
  });

  /** Live form value as a signal so the total updates as tickets change. */
  readonly formValue = toSignal(this.form.valueChanges, {
    initialValue: this.form.getRawValue(),
  });

  readonly totalDue = computed(() => {
    const ev = this.event();
    const tickets = Number(this.formValue().tickets_purchased) || 0;
    return ev ? Number(ev.ticket_price) * tickets : 0;
  });

  constructor() {
    effect(() => {
      const id = Number(this.id());

      if (!Number.isFinite(id) || id <= 0) {
        this.loadError.set('This registration link is not valid.');
        this.loading.set(false);
        return;
      }

      this.loadEvent(id);
    });
  }

  private loadEvent(id: number): void {
    this.loading.set(true);
    this.loadError.set('');

    this.eventService.getEventById(id).subscribe({
      next: (event) => {
        this.event.set(event);
        this.loading.set(false);

        if (event.tickets_remaining !== null && event.tickets_remaining !== undefined) {
          const max = Math.min(10, event.tickets_remaining);
          this.form.controls.tickets_purchased.setValidators([
            Validators.required,
            Validators.min(1),
            Validators.max(Math.max(max, 1)),
            Validators.pattern(/^\d+$/),
          ]);
          this.form.controls.tickets_purchased.updateValueAndValidity();
        }
      },
      error: (err) => {
        this.loadError.set(extractApiError(err, 'Unable to load this event.'));
        this.loading.set(false);
      },
    });
  }

  submit(): void {
    this.submitError.set('');

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const ev = this.event();
    if (!ev) return;

    const value = this.form.getRawValue();

    this.submitting.set(true);

    this.registrationService
      .createRegistration({
        event_id: ev.event_id,
        attendee_name: value.attendee_name.trim(),
        attendee_email: value.attendee_email.trim(),
        attendee_phone: value.attendee_phone.trim() || null,
        tickets_purchased: Number(value.tickets_purchased),
        special_requests: value.special_requests.trim() || null,
      })
      .subscribe({
        next: (created) => {
          this.confirmation.set(created);
          this.submitting.set(false);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        },
        error: (err) => {
          this.submitError.set(
            extractApiError(err, 'Registration failed. Please try again.')
          );
          this.submitting.set(false);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        },
      });
  }

  resetForAnother(): void {
    this.confirmation.set(null);
    this.form.reset({
      attendee_name: '',
      attendee_email: '',
      attendee_phone: '',
      tickets_purchased: 1,
      special_requests: '',
    });
  }

  // Convenience accessors for the template
  get name() { return this.form.controls.attendee_name; }
  get email() { return this.form.controls.attendee_email; }
  get phone() { return this.form.controls.attendee_phone; }
  get tickets() { return this.form.controls.tickets_purchased; }
  get requests() { return this.form.controls.special_requests; }
}
