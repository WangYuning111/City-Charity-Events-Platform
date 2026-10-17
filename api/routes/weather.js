// ============================================
// Weather Proxy - weather.js
// Server-side proxy for the Open-Meteo public API.
//
// Why proxy instead of calling Open-Meteo from the browser?
//   1. Removes any CORS dependency on a third party.
//   2. Lets us translate the raw WMO weather codes into human-readable
//      descriptions and icons in ONE place, so both the client and the
//      admin website render identical wording.
//   3. Allows a short-lived cache, so repeated page views do not hammer
//      the upstream service.
//
// Mounted at /api/weather
// ============================================

const express = require('express');
const router = express.Router();

const OPEN_METEO_URL = 'https://api.open-meteo.com/v1/forecast';
const CACHE_TTL_MS = 10 * 60 * 1000;     // 10 minutes
const MAX_FORECAST_DAYS = 7;

// WMO weather interpretation codes, as listed in the assessment brief.
const WEATHER_CODES = {
    0:  { description: 'Clear sky',                   icon: '☀️', group: 'clear' },
    1:  { description: 'Mainly clear',                icon: '🌤️', group: 'clear' },
    2:  { description: 'Partly cloudy',               icon: '⛅', group: 'cloudy' },
    3:  { description: 'Overcast',                    icon: '☁️', group: 'cloudy' },
    45: { description: 'Fog',                         icon: '🌫️', group: 'fog' },
    48: { description: 'Depositing rime fog',         icon: '🌫️', group: 'fog' },
    51: { description: 'Light drizzle',               icon: '🌦️', group: 'rain' },
    53: { description: 'Moderate drizzle',            icon: '🌦️', group: 'rain' },
    55: { description: 'Dense drizzle',               icon: '🌧️', group: 'rain' },
    56: { description: 'Light freezing drizzle',      icon: '🌧️', group: 'rain' },
    57: { description: 'Dense freezing drizzle',      icon: '🌧️', group: 'rain' },
    61: { description: 'Light rain',                  icon: '🌦️', group: 'rain' },
    63: { description: 'Moderate rain',               icon: '🌧️', group: 'rain' },
    65: { description: 'Heavy rain',                  icon: '🌧️', group: 'rain' },
    66: { description: 'Light freezing rain',         icon: '🌧️', group: 'rain' },
    67: { description: 'Heavy freezing rain',         icon: '🌧️', group: 'rain' },
    71: { description: 'Light snow',                  icon: '🌨️', group: 'snow' },
    73: { description: 'Moderate snow',               icon: '🌨️', group: 'snow' },
    75: { description: 'Heavy snow',                  icon: '❄️', group: 'snow' },
    77: { description: 'Snow grains',                 icon: '❄️', group: 'snow' },
    80: { description: 'Light rain showers',          icon: '🌦️', group: 'rain' },
    81: { description: 'Moderate rain showers',       icon: '🌧️', group: 'rain' },
    82: { description: 'Violent rain showers',        icon: '⛈️', group: 'rain' },
    85: { description: 'Light snow showers',          icon: '🌨️', group: 'snow' },
    86: { description: 'Heavy snow showers',          icon: '❄️', group: 'snow' },
    95: { description: 'Thunderstorm',                icon: '⛈️', group: 'storm' },
    96: { description: 'Thunderstorm with light hail', icon: '⛈️', group: 'storm' },
    99: { description: 'Thunderstorm with heavy hail', icon: '⛈️', group: 'storm' }
};

const UNKNOWN_CODE = { description: 'Unknown conditions', icon: '❔', group: 'unknown' };

function describeCode(code) {
    return WEATHER_CODES[code] || UNKNOWN_CODE;
}

// Tiny in-memory cache keyed by rounded coordinates + timezone.
const cache = new Map();

function cacheKey(lat, lon, tz) {
    return `${lat.toFixed(2)},${lon.toFixed(2)},${tz}`;
}

function fail(res, status, message) {
    return res.status(status).json({ success: false, message });
}

// ============================================
// GET /api/weather?lat=39.9087&lon=116.4576&timezone=Asia/Shanghai
// Returns a translated daily forecast for the event location.
// ============================================
router.get('/', async (req, res) => {
    try {
        const lat = Number(req.query.lat);
        const lon = Number(req.query.lon);
        const timezone = req.query.timezone || 'auto';

        if (!Number.isFinite(lat) || lat < -90 || lat > 90) {
            return fail(res, 400, 'Query parameter lat must be a number between -90 and 90');
        }
        if (!Number.isFinite(lon) || lon < -180 || lon > 180) {
            return fail(res, 400, 'Query parameter lon must be a number between -180 and 180');
        }

        const key = cacheKey(lat, lon, timezone);
        const hit = cache.get(key);

        if (hit && Date.now() - hit.at < CACHE_TTL_MS) {
            return res.json({ success: true, cached: true, data: hit.data });
        }

        const url = new URL(OPEN_METEO_URL);
        url.searchParams.set('latitude', String(lat));
        url.searchParams.set('longitude', String(lon));
        url.searchParams.set('daily', 'weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max');
        url.searchParams.set('forecast_days', String(MAX_FORECAST_DAYS));
        url.searchParams.set('timezone', timezone);

        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 8000);

        let upstream;
        try {
            upstream = await fetch(url, { signal: controller.signal });
        } finally {
            clearTimeout(timeout);
        }

        if (!upstream.ok) {
            return fail(res, 502, `Weather service responded with HTTP ${upstream.status}`);
        }

        const payload = await upstream.json();
        const daily = payload.daily || {};

        const dates = daily.time || [];
        const days = dates.map((date, i) => {
            const code = Number(daily.weather_code?.[i]);
            const meta = describeCode(code);
            return {
                date,
                code,
                description: meta.description,
                icon: meta.icon,
                group: meta.group,
                tempMax: daily.temperature_2m_max?.[i] ?? null,
                tempMin: daily.temperature_2m_min?.[i] ?? null,
                precipitationProbability: daily.precipitation_probability_max?.[i] ?? null
            };
        });

        const data = {
            latitude: payload.latitude ?? lat,
            longitude: payload.longitude ?? lon,
            timezone: payload.timezone || timezone,
            units: {
                temperature: payload.daily_units?.temperature_2m_max || '°C'
            },
            days
        };

        cache.set(key, { at: Date.now(), data });

        res.json({ success: true, cached: false, data });
    } catch (err) {
        if (err.name === 'AbortError') {
            return fail(res, 504, 'Weather service timed out');
        }
        console.error('Weather proxy failed:', err);
        fail(res, 502, 'Unable to retrieve weather data at this time');
    }
});

// Exposed so the admin UI can render the same legend without hard-coding it.
router.get('/codes', (req, res) => {
    res.json({ success: true, data: WEATHER_CODES });
});

module.exports = router;
