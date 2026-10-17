import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';

import { API_BASE } from '../config/api.config';
import { EventRegistration } from '../models/admin.models';

interface ApiListResponse<T> {
  success: boolean;
  count: number;
  data: T[];
}

/**
 * Read access to registration records.
 *
 * The dashboard only needs the aggregate view, so this service stays
 * read-only: the public site owns creation, and the console must never
 * fabricate attendee data.
 */
@Injectable({ providedIn: 'root' })
export class AdminRegistrationService {
  private readonly http = inject(HttpClient);

  /** GET /api/registrations — every registration, newest first. */
  getAll(): Observable<EventRegistration[]> {
    return this.http
      .get<ApiListResponse<EventRegistration>>(`${API_BASE}/registrations`)
      .pipe(map((res) => res.data));
  }
}
