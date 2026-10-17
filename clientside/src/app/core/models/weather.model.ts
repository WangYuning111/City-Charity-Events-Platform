/** Daily forecast returned by the API's Open-Meteo proxy (GET /api/weather). */
export interface WeatherDay {
  date: string;
  code: number;
  description: string;
  icon: string;
  group: 'clear' | 'cloudy' | 'fog' | 'rain' | 'snow' | 'storm' | 'unknown';
  tempMax: number | null;
  tempMin: number | null;
  precipitationProbability: number | null;
}

export interface WeatherForecast {
  latitude: number;
  longitude: number;
  timezone: string;
  units: { temperature: string };
  days: WeatherDay[];
}
