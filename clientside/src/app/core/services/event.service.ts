import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';

import { API_BASE } from '../config/api.config';
import {
  CharityEvent,
  EventCategory,
  EventFilters,
} from '../models/event.model';

interface ApiListResponse<T> {
  success: boolean;
  count: number;
  data: T[];
}

interface ApiItemResponse<T> {
  success: boolean;
  data: T;
}

/**
 * Single access point for every read-only event endpoint used by the
 * public website. Components stay free of raw HTTP details: they receive
 * typed Observables of domain objects.
 */
@Injectable({ providedIn: 'root' })
export class EventService {
  private readonly http = inject(HttpClient);

  /** GET /api/events — ongoing + upcoming events for the home page. */
  getPublicEvents(): Observable<CharityEvent[]> {
    return this.http
      .get<ApiListResponse<CharityEvent>>(`${API_BASE}/events`)
      .pipe(map((res) => res.data));
  }

  /**
   * GET /api/events/search — combinable filters.
   * Only filters the user actually supplied are sent, so the URL stays
   * readable and the server does the minimum amount of work.
   */
  searchEvents(filters: EventFilters): Observable<CharityEvent[]> {
    let params = new HttpParams();

    if (filters.date) params = params.set('date', filters.date);
    if (filters.location) params = params.set('location', filters.location.trim());
    if (filters.category) params = params.set('category', String(filters.category));
    if (filters.freeOnly) params = params.set('freeOnly', '1');

    return this.http
      .get<ApiListResponse<CharityEvent>>(`${API_BASE}/events/search`, { params })
      .pipe(map((res) => res.data));
  }

  /** GET /api/events/categories/list — categories with live event counts. */
  getCategories(): Observable<EventCategory[]> {
    return this.http
      .get<ApiListResponse<EventCategory>>(`${API_BASE}/events/categories/list`)
      .pipe(map((res) => res.data));
  }

  /** GET /api/events/:id — full event detail including its registrations. */
  getEventById(id: number): Observable<CharityEvent> {
    return this.http
      .get<ApiItemResponse<CharityEvent>>(`${API_BASE}/events/${id}`)
      .pipe(map((res) => res.data));
  }
}
