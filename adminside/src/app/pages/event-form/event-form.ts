import {
  Component,
  HostListener,
  OnInit,
  computed,
  effect,
  inject,
  input,
  signal,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

import { HasUnsavedChanges } from '../../core/services/unsaved-changes.guard';

import {
  CharityEvent,
  EventCategory,
  EVENT_STATUSES,
  EventPayload,
  EventStatus,
  Organization,
} from '../../core/models/admin.models';
import { AdminEventService } from '../../core/services/admin-event.service';
import { extractApiError } from '../../core/services/api-error';
import { formatDate, formatDateTime, formatMoney, statusLabel } from '../../shared/format';

@Component({
  selector: 'app-event-form',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './event-form.html',
  styleUrl: './event-form.css',
})
export class EventForm implements OnInit, HasUnsavedChanges {
  /** Present on /events/:id/edit, absent on /events/new. */
  readonly id = input<string | undefined>(undefined);

  private readonly adminService = inject(AdminEventService);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);

  readonly isEdit = computed(() => {
    const raw = this.id();
    return raw !== undefined && raw !== null && raw !== '' && Number.isFinite(Number(raw));
  });

  readonly categories = signal<EventCategory[]>([]);
  readonly organizations = signal<Organization[]>([]);
  readonly existing = signal<CharityEvent | null>(null);

  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly error = signal('');
  readonly fieldErrors = signal<string[]>([]);

  /** Set once a save has succeeded, so the route guard lets us leave. */
  private readonly saved = signal(false);

  readonly statuses = EVENT_STATUSES;
  readonly statusText = statusLabel;
  readonly dateText = formatDate;
  readonly dateTimeText = formatDateTime;
  readonly money = formatMoney;

  /**
   * Reactive form. Selects hold strings because that is what the DOM gives us;
   * numeric conversion happens once, in buildPayload().
   */
  readonly form = this.fb.group({
    event_name: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(200)]],
    category_id: ['', [Validators.required]],
    org_id: [''],
    status: ['upcoming' as EventStatus, [Validators.required]],

    event_date: ['', [Validators.required]],
    event_time: ['', [Validators.required]],
    location: ['', [Validators.required, Validators.maxLength(255)]],
    address: [''],
    latitude: [null as number | null, [Validators.min(-90), Validators.max(90)]],
    longitude: [null as number | null, [Validators.min(-180), Validators.max(180)]],

    ticket_price: [0, [Validators.required, Validators.min(0)]],
    goal_amount: [0, [Validators.min(0)]],
    current_amount: [0, [Validators.min(0)]],
    max_participants: [null as number | null, [Validators.min(1)]],

    short_description: ['', [Validators.maxLength(500)]],
    full_description: [''],
    image_url: [''],
    organizer_contact: ['', [Validators.maxLength(100)]],
  });

  constructor() {
    effect(() => {
      if (!this.isEdit()) {
        this.loading.set(false);
        return;
      }
      this.loadEvent(Number(this.id()));
    });
  }

  ngOnInit(): void {
    this.loadReferenceData();
  }

  private loadReferenceData(): void {
    this.adminService.getCategories().subscribe({
      next: (categories) => this.categories.set(categories),
      error: (err) => this.error.set(extractApiError(err, 'Unable to load categories.')),
    });

    this.adminService.getOrganizations().subscribe({
      next: (organizations) => this.organizations.set(organizations),
      error: () => this.organizations.set([]),   // optional field — not fatal
    });
  }

  private loadEvent(id: number): void {
    this.loading.set(true);
    this.error.set('');

    this.adminService.getById(id).subscribe({
      next: (event) => {
        this.existing.set(event);

        this.form.patchValue({
          event_name: event.event_name,
          category_id: String(event.category_id),
          org_id: event.org_id === null ? '' : String(event.org_id),
          status: event.status,
          event_date: String(event.event_date).substring(0, 10),
          event_time: String(event.event_time).substring(0, 5),
          location: event.location,
          address: event.address ?? '',
          latitude: event.latitude === null ? null : Number(event.latitude),
          longitude: event.longitude === null ? null : Number(event.longitude),
          ticket_price: Number(event.ticket_price),
          goal_amount: Number(event.goal_amount),
          current_amount: Number(event.current_amount),
          max_participants: event.max_participants === null ? null : Number(event.max_participants),
          short_description: event.short_description ?? '',
          full_description: event.full_description ?? '',
          image_url: event.image_url ?? '',
          organizer_contact: event.organizer_contact ?? '',
        });

        // Populating the form programmatically is not an edit by the user.
        this.form.markAsPristine();
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(extractApiError(err, 'Unable to load this event.'));
        this.loading.set(false);
      },
    });
  }

  // ---------- Submit ----------

  submit(): void {
    this.error.set('');
    this.fieldErrors.set([]);

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.fieldErrors.set(['Please correct the highlighted fields before saving.']);
      return;
    }

    const payload = this.buildPayload();
    this.saving.set(true);

    const request = this.isEdit()
      ? this.adminService.update(Number(this.id()), payload)
      : this.adminService.create(payload);

    request.subscribe({
      next: () => {
        this.saving.set(false);
        this.saved.set(true);
        this.router.navigate(['/events'], {
          queryParams: { saved: this.isEdit() ? 'updated' : 'created' },
        });
      },
      error: (err) => {
        this.saving.set(false);
        this.error.set(extractApiError(err, 'Unable to save this event.'));
        const body = (err as { error?: { errors?: string[] } })?.error;
        if (body?.errors?.length) this.fieldErrors.set(body.errors);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      },
    });
  }

  private buildPayload(): EventPayload {
    const v = this.form.getRawValue();

    const toNumber = (value: number | string | null): number | null => {
      if (value === null || value === undefined || value === '') return null;
      const n = Number(value);
      return Number.isFinite(n) ? n : null;
    };

    return {
      event_name: (v.event_name ?? '').trim(),
      category_id: Number(v.category_id),
      org_id: toNumber(v.org_id),
      status: (v.status ?? 'upcoming') as EventStatus,
      event_date: v.event_date ?? '',
      event_time: v.event_time ? (v.event_time.length === 5 ? `${v.event_time}:00` : v.event_time) : '',
      location: (v.location ?? '').trim(),
      address: (v.address ?? '').trim() || null,
      latitude: toNumber(v.latitude),
      longitude: toNumber(v.longitude),
      ticket_price: toNumber(v.ticket_price) ?? 0,
      goal_amount: toNumber(v.goal_amount) ?? 0,
      current_amount: toNumber(v.current_amount) ?? 0,
      max_participants: toNumber(v.max_participants),
      short_description: (v.short_description ?? '').trim() || null,
      full_description: (v.full_description ?? '').trim() || null,
      image_url: (v.image_url ?? '').trim() || null,
      organizer_contact: (v.organizer_contact ?? '').trim() || null,
    };
  }

  // ---------- Guard hooks ----------

  /**
   * Required by unsavedChangesGuard. A form counts as "unsaved" only when the
   * user has actually edited it and the save has not completed.
   */
  hasUnsavedChanges(): boolean {
    return this.form.dirty && !this.saved();
  }

  /** Last line of defence: the browser's own leave-site prompt. */
  @HostListener('window:beforeunload', ['$event'])
  onBeforeUnload(event: BeforeUnloadEvent): void {
    if (!this.hasUnsavedChanges()) return;
    event.preventDefault();
    event.returnValue = '';
  }

  // ---------- Template accessors ----------

  get name() { return this.form.controls.event_name; }
  get category() { return this.form.controls.category_id; }
  get status() { return this.form.controls.status; }
  get date() { return this.form.controls.event_date; }
  get time() { return this.form.controls.event_time; }
  get location() { return this.form.controls.location; }
  get latitude() { return this.form.controls.latitude; }
  get longitude() { return this.form.controls.longitude; }
  get price() { return this.form.controls.ticket_price; }
  get goal() { return this.form.controls.goal_amount; }
  get current() { return this.form.controls.current_amount; }
  get participants() { return this.form.controls.max_participants; }
  get shortDescription() { return this.form.controls.short_description; }
}
