import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';

import { API_BASE } from '../config/api.config';
import {
  CharityEvent,
  EventCategory,
  EventPayload,
  Organization,
} from '../models/admin.models';

interface ApiListResponse<T> {
  success: boolean;
  count: number;
  data: T[];
}

interface ApiItemResponse<T> {
  success: boolean;
  message?: string;
  data: T;
}

interface ApiMessageResponse {
  success: boolean;
  message: string;
}

/**
 * Encapsulates the full C.R.U.D. surface of the events resource.
 * Components never build URLs or handle raw responses.
 */
@Injectable({ providedIn: 'root' })
export class AdminEventService {
  private readonly http = inject(HttpClient);

  /** GET /api/events/admin/all — every event, regardless of status. */
  getAll(): Observable<CharityEvent[]> {
    return this.http
      .get<ApiListResponse<CharityEvent>>(`${API_BASE}/events/admin/all`)
      .pipe(map((res) => res.data));
  }

  /** GET /api/events/:id — includes the registration list. */
  getById(id: number): Observable<CharityEvent> {
    return this.http
      .get<ApiItemResponse<CharityEvent>>(`${API_BASE}/events/${id}`)
      .pipe(map((res) => res.data));
  }

  getCategories(): Observable<EventCategory[]> {
    return this.http
      .get<ApiListResponse<EventCategory>>(`${API_BASE}/events/categories/list`)
      .pipe(map((res) => res.data));
  }

  getOrganizations(): Observable<Organization[]> {
    return this.http
      .get<ApiListResponse<Organization>>(`${API_BASE}/organizations`)
      .pipe(map((res) => res.data));
  }

  /** POST /api/events */
  create(payload: EventPayload): Observable<CharityEvent> {
    return this.http
      .post<ApiItemResponse<CharityEvent>>(`${API_BASE}/events`, payload)
      .pipe(map((res) => res.data));
  }

  /** PUT /api/events/:id */
  update(id: number, payload: Partial<EventPayload>): Observable<CharityEvent> {
    return this.http
      .put<ApiItemResponse<CharityEvent>>(`${API_BASE}/events/${id}`, payload)
      .pipe(map((res) => res.data));
  }

  /** DELETE /api/events/:id — rejects with HTTP 409 when registrations exist. */
  remove(id: number): Observable<string> {
    return this.http
      .delete<ApiMessageResponse>(`${API_BASE}/events/${id}`)
      .pipe(map((res) => res.message));
  }
}
