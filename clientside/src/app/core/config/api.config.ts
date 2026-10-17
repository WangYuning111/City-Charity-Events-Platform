/**
 * Base URL of the Node/Express REST API.
 *
 * In development the Angular dev-server proxy (proxy.conf.json) forwards
 * /api to http://localhost:3000, so a relative path keeps the app free of
 * hard-coded hostnames and avoids CORS entirely.
 *
 * When the API is deployed on a different origin, replace this value with
 * the full URL, e.g. 'https://charity-api.example.edu.au/api'.
 */
export const API_BASE = '/api';
