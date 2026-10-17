import { Routes } from '@angular/router';

/**
 * Every feature is lazily loaded, so the initial bundle only contains the
 * shell plus the home page. The admin-style CRUD screens are not part of
 * this application at all — they live in the separate adminside project.
 */
export const routes: Routes = [
  {
    path: '',
    title: 'City Charity Events — Connecting Hearts, Sharing Warmth',
    loadComponent: () => import('./pages/home/home').then((m) => m.Home),
  },
  {
    path: 'search',
    title: 'Search Charity Events',
    loadComponent: () => import('./pages/search/search').then((m) => m.Search),
  },
  {
    path: 'events/:id',
    title: 'Event Details',
    loadComponent: () =>
      import('./pages/event-detail/event-detail').then((m) => m.EventDetail),
  },
  {
    path: 'events/:id/register',
    title: 'Register for an Event',
    loadComponent: () =>
      import('./pages/registration/registration').then((m) => m.Registration),
  },
  { path: '**', redirectTo: '' },
];
