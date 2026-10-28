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
 *
 * Deployed target (shared hosting): the public Angular app sits at the domain
 * root and this console at /admin/, both served from public_html with the API
 * on /api. No trailing slash - callers append /events/:id themselves.
 *
 * Defaults to the local dev server so the repository carries no deployed
 * hostname; change it to the production origin before a release build.
 */
export const PUBLIC_SITE_URL = 'http://localhost:4200';
