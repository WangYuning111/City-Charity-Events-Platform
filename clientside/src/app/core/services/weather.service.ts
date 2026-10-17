import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';

import { API_BASE } from '../config/api.config';
import { WeatherForecast } from '../models/weather.model';

interface ApiWeatherResponse {
  success: boolean;
  cached: boolean;
  data: WeatherForecast;
}

/**
 * Weather for an event location.
 *
 * The browser never talks to Open-Meteo directly: it calls our own
 * /api/weather endpoint, which proxies the upstream service, translates
 * the WMO weather codes and caches the result. That keeps the third-party
 * dependency behind our own API contract.
 */
@Injectable({ providedIn: 'root' })
export class WeatherService {
  private readonly http = inject(HttpClient);

  getForecast(latitude: number, longitude: number, timezone = 'auto'): Observable<WeatherForecast> {
    const params = new HttpParams()
      .set('lat', String(latitude))
      .set('lon', String(longitude))
      .set('timezone', timezone);

    return this.http
      .get<ApiWeatherResponse>(`${API_BASE}/weather`, { params })
      .pipe(map((res) => res.data));
  }
}
