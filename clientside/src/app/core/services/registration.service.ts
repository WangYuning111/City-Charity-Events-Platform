import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';

import { API_BASE } from '../config/api.config';
import { EventRegistration } from '../models/event.model';
import { RegistrationPayload } from '../models/registration.model';

interface ApiItemResponse<T> {
  success: boolean;
  message?: string;
  data: T;
}

@Injectable({ providedIn: 'root' })
export class RegistrationService {
  private readonly http = inject(HttpClient);

  /** POST /api/registrations — persist a ticket purchase. */
  createRegistration(payload: RegistrationPayload): Observable<EventRegistration> {
    return this.http
      .post<ApiItemResponse<EventRegistration>>(`${API_BASE}/registrations`, payload)
      .pipe(map((res) => res.data));
  }
}
