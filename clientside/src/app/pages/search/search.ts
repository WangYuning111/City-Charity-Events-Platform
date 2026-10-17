import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';

import { CharityEvent, EventCategory, EventFilters } from '../../core/models/event.model';
import { EventService } from '../../core/services/event.service';
import { extractApiError } from '../../core/services/api-error';
import { EventCard } from '../../shared/event-card/event-card';

@Component({
  selector: 'app-search',
  imports: [ReactiveFormsModule, RouterLink, EventCard],
  templateUrl: './search.html',
  styleUrl: './search.css',
})
export class Search implements OnInit {
  private readonly eventService = inject(EventService);
  private readonly fb = inject(FormBuilder);

  /**
   * Reactive form: all four criteria are optional and may be combined, so no
   * control is required. The only client-side rule is a length cap, which
   * mirrors the server's own guard and keeps the query string sane.
   */
  readonly form = this.fb.nonNullable.group({
    date: [''],
    location: ['', [Validators.maxLength(80)]],
    category: [''],
    freeOnly: [false],
  });

  readonly categories = signal<EventCategory[]>([]);
  readonly results = signal<CharityEvent[]>([]);
  readonly loading = signal(false);
  readonly error = signal('');
  readonly searched = signal(false);
  readonly appliedFilters = signal<string[]>([]);
  readonly highlightTerm = signal('');

  ngOnInit(): void {
    this.loadCategories();
  }

  private loadCategories(): void {
    // A failure here must not block searching, so it is intentionally silent.
    this.eventService.getCategories().subscribe({
      next: (categories) => this.categories.set(categories),
      error: () => this.categories.set([]),
    });
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const value = this.form.getRawValue();
    const filters: EventFilters = {
      date: value.date || null,
      location: value.location.trim() || null,
      category: value.category || null,
      freeOnly: value.freeOnly,
    };

    this.highlightTerm.set(filters.location ?? '');
    this.appliedFilters.set(this.describeFilters(filters));
    this.runSearch(filters);
  }

  private runSearch(filters: EventFilters): void {
    this.loading.set(true);
    this.error.set('');

    this.eventService.searchEvents(filters).subscribe({
      next: (events) => {
        this.results.set(events);
        this.searched.set(true);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(extractApiError(err, 'Search failed. Please try again.'));
        this.results.set([]);
        this.searched.set(true);
        this.loading.set(false);
      },
    });
  }

  /** Human-readable echo of the criteria that produced these results. */
  private describeFilters(filters: EventFilters): string[] {
    const labels: string[] = [];

    if (filters.date) labels.push(`Date: ${filters.date}`);

    if (filters.location) labels.push(`Location: "${filters.location}"`);

    if (filters.category) {
      const match = this.categories().find(
        (c) => String(c.category_id) === String(filters.category)
      );
      labels.push(`Category: ${match ? match.category_name : filters.category}`);
    }

    if (filters.freeOnly) labels.push('Free events only');

    return labels;
  }

  clearFilters(): void {
    this.form.reset({ date: '', location: '', category: '', freeOnly: false });
    this.results.set([]);
    this.searched.set(false);
    this.appliedFilters.set([]);
    this.highlightTerm.set('');
    this.error.set('');
  }

  get locationControl() {
    return this.form.controls.location;
  }
}
