/**
 * Base URL of the Node/Express REST API.
 *
 * In development the Angular dev-server proxy forwards /api to
 * http://localhost:3000, so a relative path keeps this free of hard-coded
 * hostnames. Change it to the deployed API URL for production.
 */
export const API_BASE = '/api';

/**
 * Where the public website is served. Used by the "view on site" shortcut in
 * the event list so staff can jump from the console to the visitor-facing page.
 * Update this when the public site is deployed to its own domain.
 */
export const PUBLIC_SITE_URL = 'http://localhost:4200';
